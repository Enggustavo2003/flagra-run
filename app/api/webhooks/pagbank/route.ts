import { NextResponse } from "next/server";
import { isUuid } from "@/lib/format";
import { syncOrder, validPagbankSignature } from "@/lib/payments";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// O PagBank avisa aqui quando o pedido muda de status (ex.: Pix pago).
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validPagbankSignature(req.headers, raw)) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true });
  }

  // Acha o nosso pedido pelo reference_id (é o id do pedido WOD Fotos) ou pelo id do PagBank
  let orderId: string | null = isUuid(body?.reference_id) ? body.reference_id : null;
  if (!orderId && typeof body?.id === "string") {
    const { data } = await supabaseAdmin()
      .from("orders")
      .select("id")
      .eq("gateway_order_id", body.id)
      .maybeSingle();
    orderId = data?.id ?? null;
  }

  // syncOrder consulta o pedido direto na API do PagBank, então não confia só no corpo do aviso
  if (orderId) await syncOrder(orderId).catch((e) => console.error("PagBank sync:", e));
  return NextResponse.json({ ok: true });
}
