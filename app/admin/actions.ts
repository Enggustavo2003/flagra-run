"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isUuid } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type PayoutState = { error?: string; ok?: boolean };

/** Registra um repasse feito ao fotógrafo (o Pix em si você faz no app do banco). */
export async function registerPayout(_: PayoutState, form: FormData): Promise<PayoutState> {
  await requireAdmin();
  const photographerId = String(form.get("photographer_id") ?? "");
  const amount = Math.round(Number(String(form.get("amount") ?? "").replace(/\./g, "").replace(",", ".")) * 100);
  const note = String(form.get("note") ?? "").trim().slice(0, 120);
  if (!isUuid(photographerId)) return { error: "Fotógrafo inválido." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Digite o valor que você pagou." };
  const { error } = await supabaseAdmin()
    .from("photographer_payouts")
    .insert({ photographer_id: photographerId, amount_cents: amount, note });
  if (error) return { error: "Não deu para salvar. Rodou o SQL do painel?" };
  revalidatePath("/admin");
  return { ok: true };
}
