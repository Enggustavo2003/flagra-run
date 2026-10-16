import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { syncOrder, validMpSignature } from "@/lib/payments";

export const runtime = "nodejs";

// O Mercado Pago avisa aqui quando um pagamento muda de status.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  const type = url.searchParams.get("type") ?? body?.type;
  const dataId = url.searchParams.get("data.id") ?? String(body?.data?.id ?? "");

  if (type !== "payment" || !dataId) return NextResponse.json({ ok: true });
  if (!validMpSignature(req.headers, dataId)) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  const { data: order } = await supabaseAdmin()
    .from("orders")
    .select("id")
    .eq("mp_payment_id", dataId)
    .maybeSingle();
  // syncOrder consulta o pagamento direto na API do Mercado Pago, então não confia no corpo do aviso
  if (order) await syncOrder(order.id);

  return NextResponse.json({ ok: true });
}
