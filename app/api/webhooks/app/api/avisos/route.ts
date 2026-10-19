import { NextResponse } from "next/server";
import { cleanPhone } from "@/lib/phone";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** "Me avise quando minhas fotos chegarem": guarda WhatsApp + número de peito. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const phone = cleanPhone(typeof body?.phone === "string" ? body.phone : "");
  const bib = Number(body?.bib);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 80) : "";
  if (!phone) return NextResponse.json({ error: "Digite um WhatsApp válido, com DDD." }, { status: 400 });
  if (!Number.isInteger(bib) || bib < 1 || bib > 999999) {
    return NextResponse.json({ error: "Número de peito inválido." }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from("photo_alerts")
    .upsert(
      { phone, bib, name, marketing_optin: body?.optin === true, notified_at: null },
      { onConflict: "phone,bib" }
    );
  if (error) {
    console.error("avisos:", error);
    return NextResponse.json({ error: "Não deu para salvar agora. Tente de novo." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
