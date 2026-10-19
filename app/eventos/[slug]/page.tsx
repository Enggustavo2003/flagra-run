import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { PhotoGrid } from "@/components/photo-grid";
import { brl, formatDate, previewUrl } from "@/lib/format";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ peito?: string }> };

async function getEvent(slug: string) {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("events")
    .select("id,slug,name,city,event_date,category,price_cents,photo_count,cover_path,photographer_id")
    .eq("slug", slug)
    .maybeSingle();
  return { supabase, event: data };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { event } = await getEvent(slug);
  if (!event) return {};
  return {
    title: event.name,
    description: `Fotos de ${event.name} (${event.city}). Busque pelo seu número de peito.`,
    openGraph: event.cover_path ? { images: [previewUrl(event.cover_path)] } : undefined,
  };
}

export default async function EventPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { peito } = await searchParams;
  const { supabase, event } = await getEvent(slug);
  if (!event) notFound();

  const bib = peito && /^\d+$/.test(peito) ? Number(peito) : null;
  const selfieOn = process.env.NEXT_PUBLIC_FACE_SEARCH === "1";
  let q = supabase
    .from("photos")
    .select("id,preview_path,bibs")
    .eq("event_id", event.id)
    .order("created_at")
    .limit(1000);
  if (bib) q = q.contains("bibs", [bib]);
  const { data: photos } = await q;

  const items = (photos ?? []).map((p) => ({
    id: p.id as string,
    previewUrl: previewUrl(p.preview_path),
    bibs: p.bibs as number[],
    priceCents: event.price_cents,
    eventName: event.name,
  }));

  return (
    <div className="wrap">
      <div className="ev-head">
        <div>
          <span className="tag">{event.category}</span>
          <h1>{event.name}</h1>
          <div className="ev-facts">
            <div>
              <span className="label">Data</span>
              {formatDate(event.event_date, "long")}
            </div>
            <div>
              <span className="label">Local</span>
              {event.city}
            </div>
            <div>
              <span className="label">Por foto</span>
              <span className="mono">{brl(event.price_cents)}</span>
            </div>
          </div>
        </div>
        <form className="filter">
          <div className="field">
            <label className="label" htmlFor="peito">
              Filtrar por peito
            </label>
            <input id="peito" name="peito" className="mono" inputMode="numeric" defaultValue={peito ?? ""} />
          </div>
          <button className="btn small">Filtrar</button>
          {selfieOn && (
            <Link
              className="btn small"
              href={`/selfie?album=${event.id}&nome=${encodeURIComponent(event.name)}`}
              style={{ background: "var(--bib)", color: "var(--bib-ink)" }}
            >
              Buscar com selfie
            </Link>
          )}
          {bib && (
            <Link className="btn small ghost" href={`/eventos/${event.slug}`}>
              Limpar
            </Link>
          )}
        </form>
      </div>
      <p className="muted" style={{ margin: "0 0 12px" }}>
        {items.length} de {event.photo_count} fotos
        {bib ? (
          <>
            {" "}
            com o peito <b className="mono">{bib}</b>
          </>
        ) : null}
      </p>
      {items.length > 0 ? (
        <PhotoGrid photos={items} />
      ) : (
        <div className="empty" style={{ marginBottom: 60 }}>
          <h3>{bib ? `Nenhuma foto com o peito ${bib}` : "Este álbum ainda não tem fotos"}</h3>
          {bib ? "Confira o número ou veja o álbum completo." : "Volte mais tarde."}
        </div>
      )}
    </div>
  );
}
