import { EventCard, type EventRow } from "@/components/event-card";
import { NewEventForm } from "@/components/new-event-form";
import { ProfileForm } from "@/components/profile-form";
import Link from "next/link";
import { isAdmin, requirePhotographer } from "@/lib/auth";
import { brl } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Painel do fotógrafo", robots: { index: false } };

export default async function Painel() {
  const { supabase, user } = await requirePhotographer();
  const { data: events } = await supabase
    .from("events")
    .select("id,slug,name,city,event_date,category,price_cents,cover_path,photo_count,published")
    .eq("photographer_id", user.id)
    .order("event_date", { ascending: false });

  const { data: sales } = await supabaseAdmin()
    .from("order_items")
    .select("price_cents, fee_pct, orders!inner(status)")
    .eq("photographer_id", user.id)
    .eq("orders.status", "paid");

  const { data: me } = await supabase.from("photographers").select("fee_pct, founder, name, whatsapp, instagram, modalities").eq("id", user.id).maybeSingle();
  const fee = Number(me?.fee_pct ?? process.env.PLATFORM_FEE_PCT ?? 12);
  const net = Math.round(
    (sales ?? []).reduce((s, r: any) => s + (r.price_cents * (100 - Number(r.fee_pct ?? fee))) / 100, 0)
  );
  const list = (events ?? []) as EventRow[];

  return (
    <div className="wrap studio">
      <div>
        <NewEventForm />
        <p className="note" style={{ marginTop: 12 }}>
          Entrou como {user.email}. A plataforma fica com {fee}% de cada venda, com a busca por selfie incluída.
        </p>
        {me?.founder && (
          <div className="panel" style={{ marginTop: 12, borderColor: "var(--bib)" }}>
            <span className="label">Fotógrafo fundador</span>
            <p style={{ margin: "6px 0 0" }}>
              <b>{fee}% de comissão para sempre</b>, com busca por selfie incluída e sem mensalidade.
            </p>
          </div>
        )}
        <ProfileForm
          profile={{
            name: me?.name ?? "",
            whatsapp: me?.whatsapp ?? null,
            instagram: me?.instagram ?? null,
            modalities: (me?.modalities as string[] | null) ?? [],
          }}
        />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="stats">
          <div className="stat">
            <span className="label">Álbuns</span>
            <b className="mono">{list.length}</b>
          </div>
          <div className="stat">
            <span className="label">Fotos vendidas</span>
            <b className="mono">{sales?.length ?? 0}</b>
          </div>
          <div className="stat">
            <span className="label">Seu repasse</span>
            <b className="mono">{brl(net)}</b>
          </div>
        </div>
        {isAdmin(user.email) && (
          <p style={{ margin: "0 0 12px" }}>
            <Link className="btn ghost" href="/painel/pedidos">
              Pedidos →
            </Link>{" "}
            <Link className="btn ghost" href="/painel/leads">
              Contatos e leads →
            </Link>
          </p>
        )}
        <h2 style={{ fontSize: 22, margin: "8px 0 12px" }}>Seus álbuns</h2>
        {list.length ? (
          <div className="events">
            {list.map((e) => (
              <EventCard key={e.id} e={e} href={`/painel/eventos/${e.id}`} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <h3>Nenhum álbum ainda</h3>
            Crie o primeiro evento no formulário ao lado e depois suba as fotos.
          </div>
        )}
      </div>
    </div>
  );
}
