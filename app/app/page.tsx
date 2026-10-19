import Link from "next/link";
import { EventCard, type EventRow } from "@/components/event-card";
import { CATEGORIES } from "@/lib/format";
import { DISCOUNT_MIN_PHOTOS, DISCOUNT_PCT } from "@/lib/pricing";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const supabase = await supabaseServer();
  let q = supabase
    .from("events")
    .select("id,slug,name,city,event_date,category,price_cents,cover_path,photo_count")
    .eq("published", true)
    .order("event_date", { ascending: false })
    .limit(48);
  if (cat) q = q.eq("category", cat);
  const { data: events } = await q;

  return (
    <>
      <div className="wrap hero">
        <div>
          <span className="label">Fotos de corridas, pedais e competições</span>
          <h1>
            Sua foto da prova já <em>chegou</em>.
          </h1>
          <p className="lead">
            Digite o número de peito ou o nome do evento. A gente acha as fotos em que você aparece, e
            você compra só as que gostar.
          </p>
          <form className="searchbar" action="/busca" role="search">
            <input name="q" placeholder="Número de peito ou evento" aria-label="Número de peito ou evento" required />
            <button className="btn" type="submit">
              Buscar
            </button>
          </form>
        </div>
        {process.env.NEXT_PUBLIC_FACE_SEARCH === "1" ? (
          <div className="dark-card">
            <span className="pill">Novo</span>
            <h2>Não lembra o número?</h2>
            <p>Mande uma selfie. A gente procura o seu rosto em todos os álbuns publicados.</p>
            <Link className="btn" href="/selfie" style={{ alignSelf: "flex-start", background: "var(--bib)", color: "var(--bib-ink)" }}>
              Buscar com selfie
            </Link>
          </div>
        ) : (
          <div className="dark-card">
            <span className="pill">Em breve</span>
            <h2>Busca por selfie</h2>
            <p>
              Não lembra o número? Logo você vai poder mandar uma selfie e o sistema procura o seu rosto em
              todos os álbuns.
            </p>
          </div>
        )}
      </div>

      <section className="wrap block">
        <div className="section-head">
          <h2>Eventos recentes</h2>
          <div className="chips">
            <Link className="chip" href="/" aria-current={!cat}>
              Todos
            </Link>
            {CATEGORIES.map((c) => (
              <Link key={c} className="chip" href={`/?cat=${encodeURIComponent(c)}`} aria-current={cat === c}>
                {c}
              </Link>
            ))}
          </div>
        </div>
        {events && events.length > 0 ? (
          <div className="events">
            {(events as EventRow[]).map((e) => (
              <EventCard key={e.id} e={e} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <h3>Nenhum evento publicado{cat ? ` em ${cat}` : ""} ainda</h3>
            Os álbuns aparecem aqui assim que o fotógrafo publica.
          </div>
        )}
      </section>

      <section className="wrap block">
        <div className="section-head">
          <h2>Como funciona</h2>
        </div>
        <div className="steps">
          <div className="step">
            <b>1</b>
            <h3>O fotógrafo publica</h3>
            <p>Sobe o álbum do evento e marca os números de peito. As fotos entram com marca d&apos;água.</p>
          </div>
          <div className="step">
            <b>2</b>
            <h3>Você se encontra</h3>
            <p>Busca pelo número de peito ou pelo evento e vê só as fotos em que aparece.</p>
          </div>
          <div className="step">
            <b>3</b>
            <h3>Paga no Pix e baixa</h3>
            <p>
              Recebe as fotos em alta resolução, sem marca d&apos;água. {DISCOUNT_MIN_PHOTOS} ou mais saem com{" "}
              {DISCOUNT_PCT}% de desconto.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
