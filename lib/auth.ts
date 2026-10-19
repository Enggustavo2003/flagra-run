import { redirect } from "next/navigation";
import { supabaseServer } from "./supabase/server";

/** E-mail liberado para o painel? (PHOTOGRAPHER_EMAILS vazio = todos) */
export function emailAllowed(email: string | undefined) {
  const list = (process.env.PHOTOGRAPHER_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.length === 0 || (!!email && list.includes(email.toLowerCase()));
}

/** Exige fotógrafo logado e liberado. Cria o perfil na primeira entrada. */
export async function requirePhotographer() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  if (!emailAllowed(user.email)) redirect("/entrar?erro=nao-autorizado");

  await supabase
    .from("photographers")
    .upsert(
      { id: user.id, email: user.email ?? "", name: (user.email ?? "").split("@")[0] },
      { onConflict: "id", ignoreDuplicates: true }
    );
  return { supabase, user };
}

/** Administradores da plataforma (ADMIN_EMAILS). Vazio = ninguém. */
export function isAdmin(email: string | undefined) {
  const list = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}
