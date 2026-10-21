import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin, requirePhotographer } from "@/lib/auth";
import { brl } from "@/lib/format";
import { formatPhone, whatsappLink } from "@/lib/phone";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pedidos", robots: { index: false } };

const FILTERS = [
  ["todos", "Todos"],
  ["paid", "Pagos"],
  ["pending", "Aguardando Pix"],
  ["cancelled", "Cancelados"],
] as const;

const STATUS: Record<string, string> = { paid: "Pago", pending: "Aguardando Pix", cancelled: "Cancelado" };

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { user } = await requirePhotographer();
  if (!isAdmin(user.email)) notFound();
  const { status = "todos", q = "" } = await searchParams;

  let query = supabaseAdmin()
    .from("orders")
    .select("id, access_token, buyer_name, buyer_email, buyer_phone, total_cents, status, created_at, paid_at, order_items(count)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status !== "todos") query = query.eq("status", status);
  const term = q.trim().replace(/[%,()]/g, "");
  if (term) {
    const digits = term.replace(/\D/g, "");
    query = query.or(
      [`buyer_name.ilike.%${term}%`, `buyer_email.ilike.%${term}%`, digits.length >= 4 ? `buyer_phone.ilike.%${digits}%` : ""]
        .filter(Boolean)
        .join(",")
    );
  }
  const { data: orders } = await query;
  const list = (orders ?? []) as any[];
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const paidTotal = list.filter((o) => o.status === "paid").reduce((s, o) => s + o.total_cents, 0);

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="ev-head">
        <div>
          <Link href="/painel" className="label" style={{ textDecoration: "none" }}>
            ← Painel
          </Link>
          <h1 style={{ marginTop: 8 }}>Pedidos</h1>
          <p className="muted" style={{ margin: "8px 0 0" }}>
            Só administradores veem esta página. Use o WhatsApp para mandar o link das fotos ou ajudar quem não conseguiu pagar.
          </p>
        </div>
      </div>

      <form className="filters" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", margin: "16px 0" }}>
        {FILTERS.map(([v, label]) => (
          <Link
            key={v}
            className="chip"
            aria-current={status === v ? "true" : undefined}
            href={`/painel/pedidos?status=${v}${term ? `&q=${encodeURIComponent(term)}` : ""}`}
          >
            {label}
          </Link>
        ))}
        <input type="hidden" name="status" value={status} />
        <input name="q" defaultValue={term} placeholder="Nome, e-mail ou WhatsApp" style={{ flex: "1 1 220px", minWidth: 0 }} />
        <button className="btn ghost">Buscar</button>
      </form>

      <p className="muted" style={{ margin: "0 0 12px" }}>
        {list.length} pedido(s) nesta lista · {brl(paidTotal)} pagos
      </p>

      {list.length ? (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>WhatsApp</th>
                <th>Fotos</th>
                <th>Total</th>
                <th>Situação</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => {
                const link = `${site}/pedido/${o.id}?t=${o.access_token}`;
                const first = String(o.buyer_name).split(" ")[0];
                const msg =
                  o.status === "paid"
                    ? `Oi ${first}! Aqui é do WOD Fotos. Suas fotos estão prontas para baixar, sem marca d'água: ${link}`
                    : `Oi ${first}! Aqui é do WOD Fotos. Vi que seu pedido ficou aguardando o Pix. Se precisar de ajuda, é só responder. O link do pedido é: ${link}`;
                return (
                  <tr key={o.id}>
                    <td className="mono" style={{ whiteSpace: "nowrap" }}>
                      {new Date(o.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td>
                      <b>{o.buyer_name}</b>
                      <div className="muted" style={{ fontSize: 13 }}>{o.buyer_email}</div>
                    </td>
                    <td className="mono" style={{ whiteSpace: "nowrap" }}>
                      {o.buyer_phone ? formatPhone(o.buyer_phone) : "—"}
                    </td>
                    <td className="mono">{o.order_items?.[0]?.count ?? 0}</td>
                    <td className="mono">{brl(o.total_cents)}</td>
                    <td>
                      <span className={`status${o.status === "paid" ? " paid" : ""}`}>
                        <i /> {STATUS[o.status] ?? o.status}
                      </span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {o.buyer_phone && (
                        <a className="btn" href={whatsappLink(o.buyer_phone, msg)} target="_blank" rel="noreferrer">
                          WhatsApp
                        </a>
                      )}{" "}
                      <a className="linkbtn" href={link} target="_blank" rel="noreferrer">
                        Abrir
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">
          <h3>Nenhum pedido aqui</h3>
          Quando alguém fizer uma compra, ela aparece nesta lista.
        </div>
      )}
    </div>
  );
}
