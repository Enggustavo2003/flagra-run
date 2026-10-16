import { MercadoPagoConfig, Payment } from "mercadopago";
import crypto from "node:crypto";
import { supabaseAdmin } from "./supabase/admin";

export const paymentsFake = () => process.env.PAYMENTS_FAKE === "1";

function mpPayment() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MP_ACCESS_TOKEN não configurado");
  return new Payment(new MercadoPagoConfig({ accessToken }));
}

export async function createPixPayment(o: {
  orderId: string;
  totalCents: number;
  email: string;
  name: string;
  description: string;
}) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const res = await mpPayment().create({
    body: {
      transaction_amount: o.totalCents / 100,
      description: o.description,
      payment_method_id: "pix",
      external_reference: o.orderId,
      payer: { email: o.email, first_name: o.name.split(" ")[0] },
      // o Mercado Pago só aceita URL https pública
      ...(site.startsWith("https://")
        ? { notification_url: `${site}/api/webhooks/mercadopago` }
        : {}),
    },
    requestOptions: { idempotencyKey: o.orderId },
  });
  const tx = res.point_of_interaction?.transaction_data;
  return {
    paymentId: String(res.id),
    qrCode: tx?.qr_code ?? null,
    qrBase64: tx?.qr_code_base64 ?? null,
  };
}

export async function markOrderPaid(orderId: string) {
  await supabaseAdmin()
    .from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "pending");
}

/** Consulta o Mercado Pago e atualiza o pedido. Devolve o status atual. */
export async function syncOrder(orderId: string): Promise<string> {
  const db = supabaseAdmin();
  const { data: order } = await db
    .from("orders")
    .select("status, mp_payment_id")
    .eq("id", orderId)
    .single();
  if (!order) return "missing";
  if (order.status !== "pending" || !order.mp_payment_id) return order.status;

  const p = await mpPayment().get({ id: order.mp_payment_id });
  if (p.status === "approved" && p.external_reference === orderId) {
    await markOrderPaid(orderId);
    return "paid";
  }
  if (p.status === "cancelled" || p.status === "rejected") {
    await db.from("orders").update({ status: "cancelled" }).eq("id", orderId).eq("status", "pending");
    return "cancelled";
  }
  return "pending";
}

/** Confere a assinatura do webhook do Mercado Pago (header x-signature). */
export function validMpSignature(headers: Headers, dataId: string) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // sem segredo configurado: o syncOrder consulta a API de qualquer forma
  const sig = headers.get("x-signature") ?? "";
  const requestId = headers.get("x-request-id") ?? "";
  const parts = Object.fromEntries(
    sig.split(",").map((p) => p.trim().split("=").map((s) => s.trim()) as [string, string])
  );
  if (!parts.ts || !parts.v1) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
  } catch {
    return false;
  }
}
