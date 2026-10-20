import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { supabaseServer } from "./server";

/**
 * Sessão de quem chamou a rota.
 * - Site: cookie do navegador (como sempre).
 * - App Flagra Capture: cabeçalho "Authorization: Bearer <token do login>".
 * Nos dois casos o cliente devolvido respeita o RLS daquele fotógrafo.
 */
export async function supabaseForRequest(req: Request): Promise<{ supabase: SupabaseClient; user: User | null }> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";

  if (token) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await supabase.auth.getUser(token);
    return { supabase, user: data.user ?? null };
  }

  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user ?? null };
}
