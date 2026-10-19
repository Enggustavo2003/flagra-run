"use server";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { isAdmin, requirePhotographer } from "@/lib/auth";
import { isUuid } from "@/lib/format";
import { cleanPhone } from "@/lib/phone";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function requireAdmin() {
  const { user } = await requirePhotographer();
  if (!isAdmin(user.email)) notFound();
}

export async function markNotified(id: string) {
  await requireAdmin();
  if (!isUuid(id)) return;
  await supabaseAdmin().from("photo_alerts").update({ notified_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/painel/leads");
}

/** A pessoa pediu para sair: tira a autorização de novidades em tudo que tem esse WhatsApp. */
export async function optOut(rawPhone: string) {
  await requireAdmin();
  const phone = cleanPhone(rawPhone);
  if (!phone) return;
  const db = supabaseAdmin();
  await Promise.all([
    db.from("orders").update({ marketing_optin: false }).eq("buyer_phone", phone),
    db.from("photo_alerts").update({ marketing_optin: false }).eq("phone", phone),
  ]);
  revalidatePath("/painel/leads");
}
