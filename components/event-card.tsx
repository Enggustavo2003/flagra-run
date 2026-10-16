import Link from "next/link";
import { brl, formatDate, previewUrl } from "@/lib/format";

export type EventRow = {
  id: string;
  slug: string;
  name: string;
  city: string;
  event_date: string;
  category: string;
  price_cents: number;
  cover_path: string | null;
  photo_count: number;
  published?: boolean;
};

export function EventCard({ e, href }: { e: EventRow; href?: string }) {
  return (
    <Link className="event" href={href ?? `/eventos/${e.slug}`}>
      {e.cover_path ? (
        <img className="cover" src={previewUrl(e.cover_path)} alt="" loading="lazy" />
      ) : (
        <div className="cover" />
      )}
      <div className="meta">
        <span className="tag">
          {e.category}
          {e.published === false ? " · rascunho" : ""}
        </span>
        <h3>{e.name}</h3>
        <div className="row">
          <span>{e.city}</span>
          <span className="mono">{formatDate(e.event_date)}</span>
        </div>
        <div className="row">
          <span>{e.photo_count} fotos</span>
          <span className="mono">{brl(e.price_cents)}</span>
        </div>
      </div>
    </Link>
  );
}
