import { EventCard, type EventRow } from "@/components/event-card";
import { NewEventForm } from "@/components/new-event-form";
import { requirePhotographer } from "@/lib/auth";
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
    .select("price_cents, orders!inner(status)")
    .eq("photographer_id", user.id)
    .eq("orders.status", "paid");

  const fee = Number(process.env.PLATFORM_FEE_PCT ?? 15);
  const gross = (sales ?? []).reduce((s, r: any) => s + r.price_cents, 0);
  const net = Math.round((gross * (100 - fee)) / 100);
  const list = (events ?? []) as EventRow[];

  return (
    <div className="wrap studio">
      <div>
        <NewEventForm />
        <p className="note" style={{ marginTop: 12 }}>
          Entrou como {user.email}. A plataforma fica com {fee}% de cada venda.
        </p>
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
