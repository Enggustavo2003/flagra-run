import Link from "next/link";
import { notFound } from "next/navigation";
import { EventManager } from "@/components/event-manager";
import { requirePhotographer } from "@/lib/auth";
import { brl, formatDate, isUuid, previewUrl } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Álbum", robots: { index: false } };

export default async function PainelEvento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { supabase, user } = await requirePhotographer();

  const { data: event } = await supabase
    .from("events")
    .select("id,slug,name,city,event_date,category,price_cents,published,photo_count,photographer_id")
    .eq("id", id)
    .maybeSingle();
  if (!event || event.photographer_id !== user.id) notFound();

  const { data: photos } = await supabase
    .from("photos")
    .select("id, preview_path, bibs")
    .eq("event_id", id)
    .order("created_at");

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <div className="ev-head">
        <div>
          <Link href="/painel" className="label" style={{ textDecoration: "none" }}>
            ← Seus álbuns
          </Link>
          <h1 style={{ marginTop: 8 }}>{event.name}</h1>
          <div className="ev-facts">
            <div>
              <span className="label">Data</span>
              {formatDate(event.event_date, "long")}
            </div>
            <div>
              <span className="label">Local</span>
              {event.city || "—"}
            </div>
            <div>
              <span className="label">Por foto</span>
              <span className="mono">{brl(event.price_cents)}</span>
            </div>
            <div>
              <span className="label">Situação</span>
              {event.published ? "Publicado" : "Rascunho"}
            </div>
          </div>
        </div>
      </div>
      <EventManager
        eventId={event.id}
        slug={event.slug}
        userId={user.id}
        published={event.published}
        initial={(photos ?? []).map((p) => ({
          id: p.id,
          previewUrl: previewUrl(p.preview_path),
          bibs: p.bibs as number[],
        }))}
      />
    </div>
  );
}
