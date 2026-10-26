import { pixFeeCents } from "./pricing";
import { supabaseAdmin } from "./supabase/admin";

const TZ = "America/Sao_Paulo";
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ }); // AAAA-MM-DD
const monthKey = (d: Date) => dayKey(d).slice(0, 7);
const hourOf = (d: Date) => Number(d.toLocaleString("en-US", { timeZone: TZ, hour: "2-digit", hour12: false })) % 24;

export const PERIODS = [
  ["7", "7 dias"],
  ["30", "30 dias"],
  ["90", "90 dias"],
  ["tudo", "Tudo"],
] as const;

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;

export async function getDashboard(period: string) {
  const db = supabaseAdmin();
  const days = period === "tudo" ? null : Math.max(1, Number(period) || 30);
  const now = Date.now();
  const from = days ? now - days * 864e5 : 0;
  const prevFrom = days ? now - 2 * days * 864e5 : 0;
  const pixEach = pixFeeCents(); // custo do Pix por pedido, em centavos

  const [ordersRes, itemsRes, pgsRes, payoutsRes, alertsRes, eventsRes, photosRes] = await Promise.all([
    db.from("orders").select("id, status, total_cents, created_at, paid_at, buyer_phone, buyer_email, marketing_optin").limit(50000),
    db
      .from("order_items")
      .select("order_id, price_cents, fee_pct, pix_fee_cents, photographer_id, event_id, orders!inner(status, paid_at), events(name, slug)")
      .eq("orders.status", "paid")
      .limit(100000),
    db.from("photographers").select("id, name, email, founder, fee_pct, whatsapp, created_at"),
    db.from("photographer_payouts").select("photographer_id, amount_cents, paid_at"),
    db.from("photo_alerts").select("id, marketing_optin, notified_at"),
    db.from("events").select("id, published"),
    db.from("photos").select("id", { count: "exact", head: true }),
  ]);

  const orders = (ordersRes.data ?? []) as any[];
  const items = (itemsRes.data ?? []) as any[];
  const pgs = (pgsRes.data ?? []) as any[];
  const payouts = (payoutsRes.data ?? []) as any[];
  const alerts = (alertsRes.data ?? []) as any[];
  const events = (eventsRes.data ?? []) as any[];

  const t = (s: string | null) => (s ? new Date(s).getTime() : 0);
  const inP = (ms: number) => ms >= from && ms <= now;
  const inPrev = (ms: number) => days !== null && ms >= prevFrom && ms < from;

  // ---------- vendas no período ----------
  const paid = orders.filter((o) => o.status === "paid");
  const paidP = paid.filter((o) => inP(t(o.paid_at ?? o.created_at)));
  const paidPrev = paid.filter((o) => inPrev(t(o.paid_at ?? o.created_at)));
  const itemsP = items.filter((i) => inP(t(i.orders?.paid_at)));
  const itemsPrev = items.filter((i) => inPrev(t(i.orders?.paid_at)));
  const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

  const gmv = sum(paidP.map((o) => o.total_cents));
  const gmvPrev = sum(paidPrev.map((o) => o.total_cents));
  const commission = Math.round(sum(itemsP.map((i) => (i.price_cents * Number(i.fee_pct ?? 12)) / 100)));
  const commissionPrev = Math.round(sum(itemsPrev.map((i) => (i.price_cents * Number(i.fee_pct ?? 12)) / 100)));
  // Custo real do Pix (por pedido) e quanto dele foi descontado dos fotógrafos
  const pixFee = paidP.length * pixEach;
  const pixCharged = sum(itemsP.map((i) => Number(i.pix_fee_cents ?? 0)));
  const created = orders.filter((o) => inP(t(o.created_at)));
  const createdPaid = created.filter((o) => o.status === "paid").length;
  const lost = created.filter((o) => o.status !== "paid");

  const delta = (a: number, b: number) => (days === null || b === 0 ? null : Math.round(((a - b) / b) * 100));

  // ---------- série no tempo ----------
  const byMonth = days === null || days > 90;
  const buckets: { key: string; label: string; cents: number; orders: number }[] = [];
  if (byMonth) {
    const first = paid.length ? Math.min(...paid.map((o) => t(o.paid_at ?? o.created_at))) : now;
    const start = new Date(Math.max(first, now - 365 * 864e5));
    const d = new Date(start.getFullYear(), start.getMonth(), 15);
    while (d.getTime() <= now + 31 * 864e5 && buckets.length < 13) {
      const k = monthKey(d);
      if (!buckets.find((b) => b.key === k))
        buckets.push({ key: k, label: d.toLocaleDateString("pt-BR", { month: "short", timeZone: TZ }).replace(".", ""), cents: 0, orders: 0 });
      d.setMonth(d.getMonth() + 1);
    }
  } else {
    for (let i = days! - 1; i >= 0; i--) {
      const d = new Date(now - i * 864e5);
      buckets.push({ key: dayKey(d), label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: TZ }), cents: 0, orders: 0 });
    }
  }
  for (const o of byMonth ? paid : paidP) {
    const d = new Date(o.paid_at ?? o.created_at);
    const b = buckets.find((x) => x.key === (byMonth ? monthKey(d) : dayKey(d)));
    if (b) { b.cents += o.total_cents; b.orders++; }
  }

  // ---------- horário das vendas ----------
  const hours = Array.from({ length: 24 }, () => 0);
  for (const o of paidP) hours[hourOf(new Date(o.paid_at ?? o.created_at))]++;

  // ---------- eventos que mais vendem ----------
  const evMap = new Map<string, { name: string; slug: string; cents: number; photos: number }>();
  for (const i of itemsP) {
    const e = evMap.get(i.event_id) ?? { name: i.events?.name ?? "—", slug: i.events?.slug ?? "", cents: 0, photos: 0 };
    e.cents += i.price_cents; e.photos++;
    evMap.set(i.event_id, e);
  }
  const topEvents = [...evMap.values()].sort((a, b) => b.cents - a.cents).slice(0, 8);

  // ---------- repasses (sempre o total, não só o período) ----------
  const repasses = pgs
    .map((p) => {
      const mine = items.filter((i) => i.photographer_id === p.id);
      const sold = sum(mine.map((i) => i.price_cents));
      const owed = Math.round(
        sum(mine.map((i) => (i.price_cents * (100 - Number(i.fee_pct ?? 12))) / 100 - Number(i.pix_fee_cents ?? 0)))
      );
      const paidOut = sum(payouts.filter((x) => x.photographer_id === p.id).map((x) => x.amount_cents));
      const soldP = sum(itemsP.filter((i) => i.photographer_id === p.id).map((i) => i.price_cents));
      return { id: p.id, name: p.name || p.email, email: p.email, whatsapp: p.whatsapp, founder: p.founder,
        feePct: Number(p.fee_pct), photos: mine.length, sold, soldP, owed, paidOut, balance: owed - paidOut };
    })
    .sort((a, b) => b.balance - a.balance || b.sold - a.sold);

  // ---------- base de contatos ----------
  const customers = new Map<string, { paid: number; optin: boolean }>();
  for (const o of orders) {
    const k = o.buyer_phone || String(o.buyer_email).toLowerCase();
    const c = customers.get(k) ?? { paid: 0, optin: false };
    if (o.status === "paid") c.paid++;
    if (o.marketing_optin) c.optin = true;
    customers.set(k, c);
  }
  const buyers = [...customers.values()].filter((c) => c.paid > 0);

  return {
    days,
    pixEach,
    sales: {
      gmv, gmvDelta: delta(gmv, gmvPrev),
      commission, commissionDelta: delta(commission, commissionPrev),
      pixFee, pixCharged, net: commission + pixCharged - pixFee,
      orders: paidP.length, ordersDelta: delta(paidP.length, paidPrev.length),
      photos: itemsP.length,
      ticket: paidP.length ? Math.round(gmv / paidP.length) : 0,
      photosPerOrder: paidP.length ? itemsP.length / paidP.length : 0,
      created: created.length,
      conversion: created.length ? Math.round((createdPaid / created.length) * 100) : null,
      lostOrders: lost.length,
      lostCents: sum(lost.map((o) => o.total_cents)),
    },
    series: { byMonth, buckets },
    hours,
    topEvents,
    repasses,
    totals: {
      owed: sum(repasses.map((r) => Math.max(0, r.balance))),
      paidOut: sum(payouts.map((p) => p.amount_cents)),
    },
    base: {
      customers: customers.size,
      buyers: buyers.length,
      repeat: buyers.length ? Math.round((buyers.filter((c) => c.paid >= 2).length / buyers.length) * 100) : null,
      optin: [...customers.values()].filter((c) => c.optin).length + alerts.filter((a) => a.marketing_optin).length,
      alerts: alerts.length,
      alertsOpen: alerts.filter((a) => !a.notified_at).length,
      photographers: pgs.length,
      founders: pgs.filter((p) => p.founder).length,
      noWhatsapp: pgs.filter((p) => !p.whatsapp).length,
      albums: events.filter((e) => e.published).length,
      photos: photosRes.count ?? 0,
    },
  };
}
