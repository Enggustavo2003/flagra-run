import crypto from "node:crypto";
import { supabaseAdmin } from "./supabase/admin";

/**
 * Pagamentos via Asaas (cobrança Pix).
 * Docs: https://docs.asaas.com/docs/cobrancas-via-pix
 * Requer uma chave Pix cadastrada na conta Asaas (senão o QR Code é temporário).
 */

export const paymentsFake = () => process.env.PAYMENTS_FAKE === "1";

function apiBase() {
  return process.env.ASAAS_ENV === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";
}

function apiKey() {
  const k = process.env.ASAAS_API_KEY;
  if (!k) throw new Error("ASAAS_API_KEY não configurada");
  return k;
}

async function asaas(path: string, init?: RequestInit) {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      access_token: apiKey(),
      "User-Agent": "WODFotos",
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Asaas ${res.status}: ${JSON.stringify(body?.errors ?? body).slice(0, 500)}`);
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

/** Data de amanhã no horário de Brasília (AAAA-MM-DD): o Pix vale até o fim desse dia. */
function dueDate() {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
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
  // O Asaas cobra de um "cliente". notificationDisabled evita e-mail/SMS do Asaas para o comprador.
  const customer = await asaas("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: o.name,
      cpfCnpj: o.cpf,
      email: o.email,
      mobilePhone: o.phone,
      externalReference: o.orderId,
      notificationDisabled: true,
    }),
  });

  const payment = await asaas("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: customer.id,
      billingType: "PIX",
      value: Number((o.totalCents / 100).toFixed(2)),
      dueDate: dueDate(),
      description: `WOD Fotos · ${o.photoCount} foto(s)`,
      externalReference: o.orderId,
    }),
  });

  const qr = await asaas(`/payments/${encodeURIComponent(payment.id)}/pixQrCode`);
  return {
    gatewayOrderId: String(payment.id),
    qrCode: (qr.payload as string) ?? null,
    qrBase64: (qr.encodedImage as string) ?? null,
  };
}

export async function markOrderPaid(orderId: string) {
  await supabaseAdmin()
    .from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "pending");
}

/** Consulta a cobrança no Asaas e atualiza o nosso pedido. Devolve o status atual. */
export async function syncOrder(orderId: string): Promise<string> {
  const db = supabaseAdmin();
  const { data: order } = await db
    .from("orders")
    .select("status, gateway_order_id")
    .eq("id", orderId)
    .single();
  if (!order) return "missing";
  if (order.status !== "pending" || !order.gateway_order_id) return order.status;

  const remote = await asaas(`/payments/${encodeURIComponent(order.gateway_order_id)}`);
  if (remote.externalReference && remote.externalReference !== orderId) return "pending";

  if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(remote.status)) {
    await markOrderPaid(orderId);
    return "paid";
  }
  if (remote.status === "DELETED") {
    await db.from("orders").update({ status: "cancelled" }).eq("id", orderId).eq("status", "pending");
    return "cancelled";
  }
  return "pending";
}

/** Confere o token do webhook: o Asaas manda o authToken que você cadastrou no header asaas-access-token. */
export function validAsaasToken(headers: Headers) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN ?? "";
  const received = headers.get("asaas-access-token") ?? "";
  if (!expected || !received) return false;
  const a = crypto.createHash("sha256").update(expected).digest();
  const b = crypto.createHash("sha256").update(received).digest();
  return crypto.timingSafeEqual(a, b);
}
