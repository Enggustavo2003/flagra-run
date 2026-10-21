import Link from "next/link";
import { PayoutForm } from "@/components/payout-form";
import { PERIODS, type Dashboard } from "@/lib/dashboard";
import { brl } from "@/lib/format";
import { formatPhone } from "@/lib/phone";

const pct = (n: number | null) =>
  n === null ? null : (
    <span style={{ color: n >= 0 ? "var(--ok)" : "var(--danger)", fontSize: 13, fontWeight: 600 }}>
      {n >= 0 ? "▲" : "▼"} {Math.abs(n)}%
    </span>
  );

export function AdminView({ d, period }: { d: Dashboard; period: string }) {
  const s = d.sales;
  const vs = d.days ? `vs. ${d.days} dias anteriores` : "";

  return (
    <div className="wrap admin" style={{ paddingBottom: 60 }}>
      <div className="ev-head">
        <div>
          <span className="label">Administração</span>
          <h1 style={{ marginTop: 6 }}>WOD Fotos em números</h1>
        </div>
        <div className="chips">
          {PERIODS.map(([v, label]) => (
            <Link key={v} className="chip" aria-current={period === v ? "true" : undefined} href={`/admin?p=${v}`}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      <nav className="chips" style={{ margin: "4px 0 18px" }} aria-label="Atalhos">
        <Link className="btn ghost small" href="/painel/pedidos">Pedidos</Link>
        <Link className="btn ghost small" href="/painel/leads">Contatos e leads</Link>
        <Link className="btn ghost small" href="/painel">Meu painel de fotógrafo</Link>
      </nav>

      {/* ---------- dinheiro ---------- */}
      <section className="kpis">
        <div className="kpi kpi-main">
          <span className="label">Resultado da plataforma</span>
          <b>{brl(s.net)}</b>
          <small>
            {brl(s.commission)} de comissão − {brl(s.pixFee)} de Pix ({String(d.pixPct).replace(".", ",")}%) {pct(s.commissionDelta)}
          </small>
        </div>
        <div className="kpi">
          <span className="label">Vendas no site</span>
          <b>{brl(s.gmv)}</b>
          <small>{pct(s.gmvDelta)} {vs}</small>
        </div>
        <div className="kpi">
          <span className="label">Pedidos pagos</span>
          <b>{s.orders}</b>
          <small>{pct(s.ordersDelta)} {s.photos} fotos</small>
        </div>
        <div className="kpi">
          <span className="label">Ticket médio</span>
          <b>{brl(s.ticket)}</b>
          <small>{s.photosPerOrder.toFixed(1).replace(".", ",")} fotos por pedido</small>
        </div>
        <div className="kpi">
          <span className="label">Conversão do Pix</span>
          <b>{s.conversion === null ? "—" : `${s.conversion}%`}</b>
          <small>{s.created} Pix gerados</small>
        </div>
        <div className="kpi warn wide">
          <span className="label">Venda que ficou no Pix</span>
          <b>{brl(s.lostCents)}</b>
          <small>
            {s.lostOrders} pedido(s) sem pagar ·{" "}
            <Link href="/painel/pedidos?status=pending">chamar no WhatsApp</Link>
          </small>
        </div>
      </section>

      {/* ---------- gráfico ---------- */}
      <section className="panel" style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: 20 }}>{d.series.byMonth ? "Vendas por mês" : "Vendas por dia"}</h2>
        <Bars data={d.series.buckets.map((b) => ({ label: b.label, value: b.cents, title: `${b.label}: ${brl(b.cents)} · ${b.orders} pedido(s)` }))} money />
      </section>

      <div className="admin-two">
        <section className="panel">
          <h2 style={{ fontSize: 20 }}>Horário das vendas</h2>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>Bom para escolher a hora de postar e de mandar aviso.</p>
          <Bars data={d.hours.map((v, h) => ({ label: h % 3 === 0 ? `${h}h` : "", value: v, title: `${h}h: ${v} pedido(s)` }))} />
        </section>

        <section className="panel">
          <h2 style={{ fontSize: 20 }}>Álbuns que mais vendem</h2>
          {d.topEvents.length ? (
            <table className="table" style={{ marginTop: 8 }}>
              <tbody>
                {d.topEvents.map((e) => (
                  <tr key={e.slug + e.name}>
                    <td>{e.slug ? <Link href={`/eventos/${e.slug}`}>{e.name}</Link> : e.name}</td>
                    <td className="mono">{e.photos} fotos</td>
                    <td className="mono" style={{ textAlign: "right" }}>{brl(e.cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">Sem vendas no período.</p>
          )}
        </section>
      </div>

      {/* ---------- base ---------- */}
      <h2 style={{ fontSize: 22, margin: "26px 0 10px" }}>Base de contatos</h2>
      <section className="kpis small">
        <Mini label="Clientes" value={d.base.customers} sub={`${d.base.buyers} já compraram`} />
        <Mini label="Compram de novo" value={d.base.repeat === null ? "—" : `${d.base.repeat}%`} sub="clientes com 2+ compras" />
        <Mini label="Autorizaram novidades" value={d.base.optin} sub="podem receber promoção" />
        <Mini label="Avisos de fotos" value={d.base.alertsOpen} sub={`abertos de ${d.base.alerts}`} href="/painel/leads?aba=avisos" />
        <Mini label="Fotógrafos" value={d.base.photographers} sub={`${d.base.founders}/30 fundadores · ${d.base.noWhatsapp} sem WhatsApp`} href="/painel/leads?aba=fotografos" />
        <Mini label="No ar" value={d.base.albums} sub={`álbuns · ${d.base.photos} fotos`} />
      </section>

      {/* ---------- repasses ---------- */}
      <div className="ev-head" style={{ marginTop: 26 }}>
        <div>
          <h2 style={{ fontSize: 22 }}>Repasses aos fotógrafos</h2>
          <p className="muted" style={{ margin: "4px 0 0", maxWidth: 640 }}>
            Saldo de tudo que já foi vendido, menos o que você já pagou. Faça o Pix pelo app do banco e registre aqui.
          </p>
        </div>
        <div className="kpi" style={{ minWidth: 200 }}>
          <span className="label">Total a repassar</span>
          <b>{brl(d.totals.owed)}</b>
          <small>{brl(d.totals.paidOut)} já pagos</small>
        </div>
      </div>
      {d.repasses.length ? (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr><th>Fotógrafo</th><th>Plano</th><th>Fotos vendidas</th><th>Vendeu</th><th>Direito dele</th><th>Já pago</th><th>Saldo</th><th></th></tr>
            </thead>
            <tbody>
              {d.repasses.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.name}</b>
                    <div className="muted" style={{ fontSize: 13 }}>{r.whatsapp ? formatPhone(r.whatsapp) : r.email}</div>
                  </td>
                  <td>{r.founder ? `Fundador ${r.feePct}%` : `${r.feePct}%`}</td>
                  <td className="mono">{r.photos}</td>
                  <td className="mono">{brl(r.sold)}</td>
                  <td className="mono">{brl(r.owed)}</td>
                  <td className="mono">{brl(r.paidOut)}</td>
                  <td className="mono"><b>{brl(r.balance)}</b></td>
                  <td style={{ minWidth: 150 }}>{r.balance > 0 && <PayoutForm photographerId={r.id} balance={r.balance} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty"><h3>Nenhum fotógrafo ainda</h3></div>
      )}
    </div>
  );
}

function Mini({ label, value, sub, href }: { label: string; value: number | string; sub: string; href?: string }) {
  const body = (
    <>
      <span className="label">{label}</span>
      <b>{value}</b>
      <small>{sub}</small>
    </>
  );
  return href ? <Link className="kpi link" href={href}>{body}</Link> : <div className="kpi">{body}</div>;
}

/** Barras simples em SVG, desenhadas no servidor. */
function Bars({ data, money }: { data: { label: string; value: number; title: string }[]; money?: boolean }) {
  const W = 720, H = 180, top = 16, bottom = 24, left = 22;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = data.length;
  const slot = (W - left * 2) / n;
  const bw = Math.max(2, Math.min(36, slot * 0.7));
  const y = (v: number) => top + (H - top - bottom) * (1 - v / max);
  const peak = data.reduce((m, d, i) => (d.value > data[m].value ? i : m), 0);
  return (
    <div style={{ overflowX: "auto", marginTop: 10 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Gráfico de barras" style={{ minWidth: 420, display: "block" }}>
        <line x1={0} x2={W} y1={H - bottom} y2={H - bottom} stroke="var(--line)" />
        {data.map((d, i) => {
          const x = left + i * slot + (slot - bw) / 2;
          const h = Math.max(d.value > 0 ? 2 : 0, H - bottom - y(d.value));
          return (
            <g key={i}>
              <title>{d.title}</title>
              <rect x={x} y={H - bottom - h} width={bw} height={h} rx={3} fill={i === peak && d.value > 0 ? "var(--accent)" : "var(--muted)"} fillOpacity={i === peak ? 1 : 0.45} />
              {d.label && (n <= 31 ? i % Math.ceil(n / 10) === 0 || n <= 13 : true) && (
                <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize={13} fill="var(--muted)" fontFamily="var(--mono)">{d.label}</text>
              )}
            </g>
          );
        })}
        {data[peak]?.value > 0 && (
          <text x={Math.min(W - 4, Math.max(4, left + peak * slot + slot / 2))} y={Math.max(11, y(data[peak].value) - 4)} textAnchor="middle" fontSize={13} fill="var(--ink)" fontFamily="var(--mono)">
            {money ? brl(data[peak].value) : data[peak].value}
          </text>
        )}
      </svg>
    </div>
  );
}
