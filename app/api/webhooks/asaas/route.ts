import { NextResponse } from "next/server";
import { isUuid } from "@/lib/format";
import { syncOrder, validAsaasToken } from "@/lib/payments";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// O Asaas avisa aqui quando uma cobrança muda de status (ex.: Pix pago).
export async function POST(req: Request) {
  if (!validAsaasToken(req.headers)) {
    return NextResponse.json({ error: "token inválido" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ ok: true });
  }

  const pay = body?.payment ?? {};
  // Acha o nosso pedido pelo externalReference (id do pedido WOD Fotos) ou pelo id da cobrança no Asaas
  let orderId: string | null = isUuid(pay.externalReference) ? pay.externalReference : null;
  if (!orderId && typeof pay.id === "string") {
    const { data } = await supabaseAdmin().from("orders").select("id").eq("gateway_order_id", pay.id).maybeSingle();
    orderId = data?.id ?? null;
  }

  // syncOrder consulta a cobrança direto na API do Asaas, então não confia só no corpo do aviso
  if (orderId) await syncOrder(orderId).catch((e) => console.error("Asaas sync:", e));
  return NextResponse.json({ ok: true });
}
