import crypto from "node:crypto";
import QRCode from "qrcode";
import { supabaseAdmin } from "./supabase/admin";

/**
 * Pagamentos via PagBank (API Orders, Pix).
 * Docs: https://developer.pagbank.com.br/reference/criar-pedido-com-qr-code-pix-v2
 */

export const paymentsFake = () => process.env.PAYMENTS_FAKE === "1";

function apiBase() {
  return process.env.PAGBANK_ENV === "production"
    ? "https://api.pagseguro.com"
    : "https://sandbox.api.pagseguro.com";
}

function token() {
  const t = process.env.PAGBANK_TOKEN;
  if (!t) throw new Error("PAGBANK_TOKEN não configurado");
  return t;
}

async function pagbank(path: string, init?: RequestInit) {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`PagBank ${res.status}: ${JSON.stringify(body?.error_messages ?? body).slice(0, 500)}`);
  }
  return body;
}

/** Só os dígitos de um CPF válido, ou null. */
export function cleanCpf(input: string) {
  const d = input.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return null;
  const check = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return check(9) === Number(d[9]) && check(10) === Number(d[10]) ? d : null;
}

export async function createPixPayment(o: {
  orderId: string;
  totalCents: number;
  email: string;
  name: string;
  cpf: string;
  phone: string;
  photoCount: number;
}) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  // Pix vale 24 horas. Formato aceito: 2026-08-06T20:14:00Z
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");

  const order = await pagbank("/orders", {
    method: "POST",
    headers: { "x-idempotency-key": o.orderId },
    body: JSON.stringify({
      reference_id: o.orderId,
      customer: {
        name: o.name,
        email: o.email,
        tax_id: o.cpf,
        phones: [{ country: "55", area: o.phone.slice(0, 2), number: o.phone.slice(2), type: "MOBILE" }],
      },
      items: [
        {
          reference_id: "fotos",
          name: `WOD Fotos (${o.photoCount})`,
          quantity: 1,
          unit_amount: o.totalCents,
        },
      ],
      charges: [
        {
          reference_id: o.orderId,
          description: `WOD Fotos · ${o.photoCount} foto(s)`,
          amount: { value: o.totalCents, currency: "BRL" },
          payment_method: { type: "PIX", pix: { expiration_date: expires } },
        },
      ],
      // o PagBank só aceita URL https pública
      ...(site.startsWith("https://") ? { notification_urls: [`${site}/api/webhooks/pagbank`] } : {}),
    }),
  });

  const charge = order.charges?.[0];
  const text: string | null = charge?.qr_code?.text ?? order.qr_codes?.[0]?.text ?? null;
  const qrBase64 = text
    ? (await QRCode.toDataURL(text, { margin: 1, width: 480 })).replace(/^data:image\/png;base64,/, "")
    : null;

  return { gatewayOrderId: String(order.id), qrCode: text, qrBase64 };
}

export async function markOrderPaid(orderId: string) {
  await supabaseAdmin()
    .from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "pending");
}

/** Consulta o pedido no PagBank e atualiza o nosso. Devolve o status atual. */
export async function syncOrder(orderId: string): Promise<string> {
  const db = supabaseAdmin();
  const { data: order } = await db
    .from("orders")
    .select("status, gateway_order_id")
    .eq("id", orderId)
    .single();
  if (!order) return "missing";
  if (order.status !== "pending" || !order.gateway_order_id) return order.status;

  const remote = await pagbank(`/orders/${encodeURIComponent(order.gateway_order_id)}`);
  if (remote.reference_id && remote.reference_id !== orderId) return "pending";

  const charges: any[] = remote.charges ?? [];
  if (charges.some((c) => c.status === "PAID")) {
    await markOrderPaid(orderId);
    return "paid";
  }
  if (charges.length && charges.every((c) => c.status === "CANCELED" || c.status === "DECLINED")) {
    await db.from("orders").update({ status: "cancelled" }).eq("id", orderId).eq("status", "pending");
    return "cancelled";
  }
  return "pending";
}

/** Confere a assinatura do webhook: sha256("{token}-{corpo}") em hex no header x-authenticity-token. */
export function validPagbankSignature(headers: Headers, rawBody: string) {
  const received = headers.get("x-authenticity-token") ?? "";
  if (!received) return false;
  const expected = crypto.createHash("sha256").update(`${token()}-${rawBody}`, "utf8").digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received.toLowerCase()));
  } catch {
    return false;
  }
}
