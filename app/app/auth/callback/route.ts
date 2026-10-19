import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Recebe o clique no link de acesso enviado por e-mail
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/painel", url.origin));
  }
  return NextResponse.redirect(new URL("/entrar?erro=link", url.origin));
}
