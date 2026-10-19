import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Recebe o clique no link de acesso enviado por e-mail
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    const next = url.searchParams.get("next") ?? "/painel";
    const dest = next.startsWith("/") && !next.startsWith("//") ? next : "/painel";
    if (!error) return NextResponse.redirect(new URL(dest, url.origin));
  }
  return NextResponse.redirect(new URL("/entrar?erro=link", url.origin));
}
