"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePhotographer } from "@/lib/auth";
import { CATEGORIES, isUuid, parseBibs, slugify } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type FormState = { error?: string };

export async function createEvent(_: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requirePhotographer();
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  const city = String(form.get("city") ?? "").trim().slice(0, 80);
  const date = String(form.get("date") ?? "");
  const category = String(form.get("category") ?? "Corrida");
  const price = Number(String(form.get("price") ?? "").replace(",", "."));

  if (name.length < 3) return { error: "Dê um nome ao evento." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Escolha a data do evento." };
  if (!(price >= 1 && price <= 1000)) return { error: "Informe um preço entre R$ 1 e R$ 1.000, como 14,90." };
  if (!(CATEGORIES as readonly string[]).includes(category)) return { error: "Categoria inválida." };

  const base = slugify(`${name}-${date.slice(0, 4)}`) || "evento";
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await supabase
    .from("events")
    .insert({
      photographer_id: user.id,
      slug,
      name,
      city,
      event_date: date,
      category,
      price_cents: Math.round(price * 100),
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Não foi possível criar o evento. Tente de novo." };
  redirect(`/painel/eventos/${data.id}`);
}

export async function setPublished(eventId: string, published: boolean) {
  const { supabase } = await requirePhotographer();
  if (!isUuid(eventId)) return;
  await supabase.from("events").update({ published }).eq("id", eventId);
  revalidatePath(`/painel/eventos/${eventId}`);
}

export async function updateBibs(photoId: string, text: string) {
  const { supabase } = await requirePhotographer();
  if (!isUuid(photoId)) return { error: "Foto inválida" };
  const bibs = parseBibs(text);
  const { error } = await supabase.from("photos").update({ bibs }).eq("id", photoId);
  return error ? { error: "Não salvou. Tente de novo." } : { bibs };
}

export async function deletePhoto(photoId: string) {
  const { supabase } = await requirePhotographer();
  if (!isUuid(photoId)) return;
  // O RLS só devolve a foto se o evento for do fotógrafo logado
  const { data: photo } = await supabase
    .from("photos")
    .select("id, event_id, original_path, preview_path")
    .eq("id", photoId)
    .maybeSingle();
  if (!photo) return;

  const admin = supabaseAdmin();
  const { count } = await admin
    .from("order_items")
    .select("photo_id", { count: "exact", head: true })
    .eq("photo_id", photoId);
  if (count && count > 0) return { error: "Esta foto já foi vendida e não pode ser apagada." };

  await admin.from("photos").delete().eq("id", photoId);
  await Promise.all([
    admin.storage.from("originals").remove([photo.original_path]),
    admin.storage.from("previews").remove([photo.preview_path]),
  ]);
  await refreshEventStats(photo.event_id);
  revalidatePath(`/painel/eventos/${photo.event_id}`);
}

export async function refreshEventStats(eventId: string) {
  const admin = supabaseAdmin();
  const [{ count }, { data: first }] = await Promise.all([
    admin.from("photos").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    admin.from("photos").select("preview_path").eq("event_id", eventId).order("created_at").limit(1),
  ]);
  await admin
    .from("events")
    .update({ photo_count: count ?? 0, cover_path: first?.[0]?.preview_path ?? null })
    .eq("id", eventId);
}
