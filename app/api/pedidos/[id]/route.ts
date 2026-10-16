import { NextResponse } from "next/server";
import { isUuid } from "@/lib/format";
import { syncOrder } from "@/lib/payments";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A página do pedido consulta aqui a cada poucos segundos enquanto espera o Pix.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(req.url).searchParams.get("t") ?? "";
  if (!isUuid(id)) return NextResponse.json({ error: "Pedido inválido" }, { status: 404 });

  const { data: order } = await supabaseAdmin()
    .from("orders")
    .select("status, access_token")
    .eq("id", id)
    .maybeSingle();
  if (!order || order.access_token !== token) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }
  if (order.status !== "pending") return NextResponse.json({ status: order.status });

  try {
    return NextResponse.json({ status: await syncOrder(id) });
  } catch {
    return NextResponse.json({ status: "pending" });
  }
}
