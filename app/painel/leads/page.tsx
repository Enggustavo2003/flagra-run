import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin, requirePhotographer } from "@/lib/auth";
import { brl } from "@/lib/format";
import { getAlerts, getCustomers, getPhotographers } from "@/lib/leads";
import { formatPhone, whatsappLink } from "@/lib/phone";
import { markNotified, optOut } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contatos e leads", robots: { index: false } };

const TABS = [
  ["avisos", "Avisos de fotos"],
  ["clientes", "Clientes"],
  ["fotografos", "Fotógrafos"],
] as const;

const day = (d: string) => new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

export default async function Leads({ searchParams }: { searchParams: Promise<{ aba?: string; so?: string }> }) {
  const { user } = await requirePhotographer();
  if (!isAdmin(user.email)) notFound();
  const { aba = "avisos", so } = await searchParams;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const onlyOptin = so === "autorizados";

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="ev-head">
        <div>
          <Link href="/painel" className="label" style={{ textDecoration: "none" }}>← Painel</Link>
          <h1 style={{ marginTop: 8 }}>Contatos e leads</h1>
          <p className="muted" style={{ margin: "8px 0 0", maxWidth: 640 }}>
            Só administradores veem esta página. Mande novidades e promoções só para quem tem <b>Autorizou: sim</b>.
            Os outros contatos servem para entregar e dar suporte no pedido.
          </p>
        </div>
        <a className="btn ghost small" href={`/painel/leads/exportar?aba=${aba}`}>Exportar planilha</a>
      </div>

      <div className="chips" style={{ margin: "16px 0" }}>
        {TABS.map(([v, label]) => (
          <Link key={v} className="chip" aria-current={aba === v ? "true" : undefined} href={`/painel/leads?aba=${v}`}>
            {label}
          </Link>
        ))}
        {aba !== "fotografos" && (
          <Link
            className="chip"
            aria-current={onlyOptin ? "true" : undefined}
            href={`/painel/leads?aba=${aba}${onlyOptin ? "" : "&so=autorizados"}`}
          >
            Só quem autorizou
          </Link>
        )}
      </div>

      {aba === "avisos" && <AlertsTab site={site} onlyOptin={onlyOptin} />}
      {aba === "clientes" && <CustomersTab onlyOptin={onlyOptin} />}
      {aba === "fotografos" && <PhotographersTab />}
    </div>
  );
}

async function AlertsTab({ site, onlyOptin }: { site: string; onlyOptin: boolean }) {
  const all = await getAlerts();
  const list = onlyOptin ? all.filter((a) => a.optin) : all;
  const ready = list.filter((a) => a.available && !a.notifiedAt).length;
  if (!list.length) return <Empty text="Quando alguém buscar um número de peito sem foto e deixar o WhatsApp, aparece aqui." />;
  return (
    <>
      <p className="muted" style={{ margin: "0 0 12px" }}>
        {list.length} aviso(s) · <b style={{ color: "var(--ink)" }}>{ready} com foto pronta para avisar</b>
      </p>
      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead><tr><th>Pedido em</th><th>Nome</th><th>WhatsApp</th><th>Peito</th><th>Fotos</th><th>Autorizou</th><th></th></tr></thead>
          <tbody>
            {list.map((a) => {
              const first = a.name.split(" ")[0] || "";
              const msg = `Oi${first ? ` ${first}` : ""}! Aqui é do WOD Fotos. Chegaram fotos do peito ${a.bib}: ${site}/busca?q=${a.bib}`;
              return (
                <tr key={a.id}>
                  <td className="mono">{day(a.createdAt)}</td>
                  <td>{a.name || "—"}</td>
                  <td className="mono" style={{ whiteSpace: "nowrap" }}>{formatPhone(a.phone)}</td>
                  <td className="mono">{a.bib}</td>
                  <td>
                    {a.notifiedAt ? (
                      <span className="muted">Avisado em {day(a.notifiedAt)}</span>
                    ) : a.available ? (
                      <span className="status paid"><i /> Pronta</span>
                    ) : (
                      <span className="muted">Ainda não</span>
                    )}
                  </td>
                  <td>{a.optin ? "sim" : "não"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {a.available && !a.notifiedAt && (
                      <>
                        <a className="btn small" href={whatsappLink(a.phone, msg)} target="_blank" rel="noreferrer">Avisar</a>{" "}
                        <form action={markNotified.bind(null, a.id)} style={{ display: "inline" }}>
                          <button className="linkbtn">Marcar avisado</button>
                        </form>
                      </>
                    )}
                    {a.optin && (
                      <form action={optOut.bind(null, a.phone)} style={{ display: "inline", marginLeft: 8 }}>
                        <button className="linkbtn">Pediu para sair</button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

async function CustomersTab({ onlyOptin }: { onlyOptin: boolean }) {
  const all = await getCustomers();
  const list = onlyOptin ? all.filter((c) => c.optin) : all;
  if (!list.length) return <Empty text="Os clientes aparecem aqui depois do primeiro pedido." />;
  const paid = list.reduce((s, c) => s + c.paidCents, 0);
  return (
    <>
      <p className="muted" style={{ margin: "0 0 12px" }}>
        {list.length} cliente(s) · {list.filter((c) => c.optin).length} autorizaram novidades · {brl(paid)} em compras pagas
      </p>
      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead><tr><th>Cliente</th><th>WhatsApp</th><th>Compras</th><th>Gasto</th><th>Último pedido</th><th>Autorizou</th><th></th></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.key}>
                <td><b>{c.name}</b><div className="muted" style={{ fontSize: 13 }}>{c.email}</div></td>
                <td className="mono" style={{ whiteSpace: "nowrap" }}>{c.phone ? formatPhone(c.phone) : "—"}</td>
                <td className="mono">{c.paidOrders}{c.pendingOrders ? <span className="muted"> (+{c.pendingOrders} sem pagar)</span> : null}</td>
                <td className="mono">{brl(c.paidCents)}</td>
                <td className="mono">{day(c.lastAt)}</td>
                <td>{c.optin ? "sim" : "não"}</td>
                <td>
                  {c.optin && c.phone && (
                    <form action={optOut.bind(null, c.phone)}>
                      <button className="linkbtn">Pediu para sair</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

async function PhotographersTab() {
  const list = await getPhotographers();
  if (!list.length) return <Empty text="Nenhum fotógrafo cadastrado ainda." />;
  return (
    <>
      <p className="muted" style={{ margin: "0 0 12px" }}>
        {list.length} fotógrafo(s) · {list.filter((p) => p.founder).length} fundadores · {list.filter((p) => !p.whatsapp).length} sem WhatsApp no perfil
      </p>
      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead><tr><th>Fotógrafo</th><th>WhatsApp</th><th>Instagram</th><th>Fotografa</th><th>Plano</th><th>Desde</th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td><b>{p.name || "—"}</b><div className="muted" style={{ fontSize: 13 }}>{p.email}</div></td>
                <td className="mono" style={{ whiteSpace: "nowrap" }}>
                  {p.whatsapp ? (
                    <a href={`https://wa.me/55${p.whatsapp}`} target="_blank" rel="noreferrer">{formatPhone(p.whatsapp)}</a>
                  ) : "—"}
                </td>
                <td>{p.instagram ? <a href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noreferrer">@{p.instagram}</a> : "—"}</td>
                <td style={{ fontSize: 13 }}>{p.modalities.join(", ") || "—"}</td>
                <td>{p.founder ? `Fundador · ${p.feePct}%` : `${p.feePct}%`}</td>
                <td className="mono">{day(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <h3>Nada por aqui ainda</h3>
      {text}
    </div>
  );
}
