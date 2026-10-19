import { supabaseAdmin } from "./supabase/admin";

export type AlertRow = {
  id: string; name: string; phone: string; bib: number; optin: boolean;
  createdAt: string; notifiedAt: string | null; available: boolean;
};
export type CustomerRow = {
  key: string; name: string; email: string; phone: string | null; optin: boolean;
  paidOrders: number; paidCents: number; pendingOrders: number; lastAt: string;
};
export type PhotographerRow = {
  id: string; name: string; email: string; whatsapp: string | null; instagram: string | null;
  modalities: string[]; founder: boolean; feePct: number; createdAt: string;
};

/** Avisos de "me avise quando minhas fotos chegarem", com a indicação se já tem foto daquele peito. */
export async function getAlerts(): Promise<AlertRow[]> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("photo_alerts")
    .select("id, name, phone, bib, marketing_optin, created_at, notified_at")
    .order("created_at", { ascending: false })
    .limit(2000);
  const rows = data ?? [];
  const bibs = [...new Set(rows.map((r) => r.bib as number))];
  const available = new Set<number>();
  if (bibs.length) {
    const { data: photos } = await db
      .from("photos")
      .select("bibs, events!inner(published)")
      .overlaps("bibs", bibs)
      .eq("events.published", true)
      .eq("hidden", false)
      .limit(5000);
    for (const p of photos ?? []) for (const b of (p.bibs as number[]) ?? []) available.add(b);
  }
  return rows.map((r) => ({
    id: r.id, name: r.name, phone: r.phone, bib: r.bib, optin: r.marketing_optin,
    createdAt: r.created_at, notifiedAt: r.notified_at, available: available.has(r.bib),
  }));
}

/** Clientes agrupados por WhatsApp (ou e-mail nos pedidos antigos). */
export async function getCustomers(): Promise<CustomerRow[]> {
  const { data } = await supabaseAdmin()
    .from("orders")
    .select("buyer_name, buyer_email, buyer_phone, status, total_cents, created_at, marketing_optin")
    .order("created_at", { ascending: false })
    .limit(10000);
  const map = new Map<string, CustomerRow>();
  for (const o of data ?? []) {
    const key = o.buyer_phone || String(o.buyer_email).toLowerCase();
    let c = map.get(key);
    if (!c) {
      c = { key, name: o.buyer_name, email: o.buyer_email, phone: o.buyer_phone, optin: false,
            paidOrders: 0, paidCents: 0, pendingOrders: 0, lastAt: o.created_at };
      map.set(key, c);
    }
    if (o.marketing_optin) c.optin = true;
    if (o.status === "paid") { c.paidOrders++; c.paidCents += o.total_cents; }
    if (o.status === "pending") c.pendingOrders++;
  }
  return [...map.values()];
}

export async function getPhotographers(): Promise<PhotographerRow[]> {
  const { data } = await supabaseAdmin()
    .from("photographers")
    .select("id, name, email, whatsapp, instagram, modalities, founder, fee_pct, created_at")
    .order("created_at", { ascending: true });
  return (data ?? []).map((p) => ({
    id: p.id, name: p.name, email: p.email, whatsapp: p.whatsapp, instagram: p.instagram,
    modalities: p.modalities ?? [], founder: p.founder, feePct: Number(p.fee_pct), createdAt: p.created_at,
  }));
}
