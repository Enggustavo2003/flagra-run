import Link from "next/link";
import { redirect } from "next/navigation";
import { EventCard, type EventRow } from "@/components/event-card";
import { AlertForm } from "@/components/alert-form";
import { PhotoGrid } from "@/components/photo-grid";
import { previewUrl } from "@/lib/format";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Busca" };

export default async function Busca({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  if (!q) redirect("/");
  const supabase = await supabaseServer();

  // Número de peito: busca em todos os álbuns publicados
  if (/^\d+$/.test(q)) {
    const { data } = await supabase
      .from("photos")
      .select("id,preview_path,bibs,events!inner(name,price_cents,published)")
      .contains("bibs", [Number(q)])
      .eq("events.published", true)
      .order("created_at", { ascending: false })
      .limit(300);
    const items = (data ?? []).map((p: any) => ({
      id: p.id,
      previewUrl: previewUrl(p.preview_path),
      bibs: p.bibs,
      priceCents: p.events.price_cents,
      eventName: p.events.name,
    }));
    const nEvents = new Set(items.map((i) => i.eventName)).size;
    return (
      <div className="wrap">
        <div className="ev-head">
          <div>
            <span className="label">Resultado da busca</span>
            <h1>Peito {q}</h1>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              {items.length} {items.length === 1 ? "foto encontrada" : "fotos encontradas"} em {nEvents}{" "}
              {nEvents === 1 ? "evento" : "eventos"}
            </p>
          </div>
          <Link className="btn ghost small" href="/">
            Nova busca
          </Link>
        </div>
        {items.length ? (
          <PhotoGrid photos={items} />
        ) : (
          <div className="empty" style={{ marginBottom: 60 }}>
            <h3>Nenhuma foto com o peito {q}</h3>
            O fotógrafo pode ainda estar marcando os números. Tente buscar pelo nome do evento.
            {Number(q) > 0 && Number(q) <= 999999 && <AlertForm bib={Number(q)} />}
          </div>
        )}
      </div>
    );
  }

  // Texto: busca eventos pelo nome ou cidade
  const term = q.replace(/[%_,()]/g, " ");
  const { data } = await supabase
    .from("events")
    .select("id,slug,name,city,event_date,category,price_cents,cover_path,photo_count")
    .eq("published", true)
    .or(`name.ilike.%${term}%,city.ilike.%${term}%`)
    .order("event_date", { ascending: false })
    .limit(48);
  const events = (data ?? []) as EventRow[];
  if (events.length === 1) redirect(`/eventos/${events[0].slug}`);

  return (
    <div className="wrap" style={{ paddingBottom: 40 }}>
      <div className="ev-head">
        <div>
          <span className="label">Resultado da busca</span>
          <h1>“{q}”</h1>
        </div>
        <Link className="btn ghost small" href="/">
          Nova busca
        </Link>
      </div>
      {events.length ? (
        <div className="events">
          {events.map((e) => (
            <EventCard key={e.id} e={e} />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h3>Nenhum evento encontrado</h3>
          Tente outro nome ou busque pelo seu número de peito.
        </div>
      )}
    </div>
  );
}
