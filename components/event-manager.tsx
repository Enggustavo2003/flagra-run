"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { deletePhoto, setPublished, updateBibs } from "@/app/painel/actions";
import { previewUrl } from "@/lib/format";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Photo = { id: string; previewUrl: string; bibs: number[] };

const MAX_MB = 40;
const PARALLEL = 3;

export function EventManager(p: {
  eventId: string;
  slug: string;
  userId: string;
  published: boolean;
  unindexed: number;
  initial: Photo[];
}) {
  const [toIndex, setToIndex] = useState(p.unindexed);
  const [indexing, setIndexing] = useState(false);

  // Indexa os rostos de fotos antigas em lotes, até acabar
  async function indexFaces() {
    setIndexing(true);
    setMsg("");
    try {
      for (let guard = 0; guard < 500; guard++) {
        const r = await fetch("/api/fotos/indexar-rostos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: p.eventId }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Falhou");
        setToIndex(d.remaining);
        if (d.remaining === 0 || (d.done === 0 && d.failed > 0)) {
          if (d.remaining > 0) setMsg(`${d.remaining} fotos não puderam ser preparadas. Tente de novo mais tarde.`);
          break;
        }
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Não foi possível preparar a busca por selfie.");
    } finally {
      setIndexing(false);
    }
  }
  const [photos, setPhotos] = useState<Photo[]>(p.initial);
  const [published, setPub] = useState(p.published);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(null);
  const [msg, setMsg] = useState("");
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadOne(file: File): Promise<Photo | null> {
    const supabase = supabaseBrowser();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${p.userId}/${p.eventId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("originals")
      .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
    if (error) return null;
    const res = await fetch("/api/fotos/processar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: p.eventId, path }),
    });
    if (!res.ok) return null;
    const { photo } = await res.json();
    return { id: photo.id, previewUrl: previewUrl(photo.preview_path), bibs: photo.bibs };
  }

  async function handleFiles(list: FileList | null) {
    if (!list) return;
    const files = [...list].filter((f) => f.type.startsWith("image/"));
    const tooBig = files.filter((f) => f.size > MAX_MB * 1024 * 1024);
    const queue = files.filter((f) => f.size <= MAX_MB * 1024 * 1024);
    if (!queue.length) {
      setMsg(tooBig.length ? `As fotos precisam ter até ${MAX_MB} MB.` : "Escolha arquivos de imagem (JPG ou PNG).");
      return;
    }
    setMsg("");
    const state = { done: 0, total: queue.length, failed: tooBig.length };
    setProgress({ ...state });
    let i = 0;
    const worker = async () => {
      while (i < queue.length) {
        const file = queue[i++];
        const photo = await uploadOne(file).catch(() => null);
        if (photo) setPhotos((prev) => [...prev, photo]);
        else state.failed++;
        state.done++;
        setProgress({ ...state });
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));
    setMsg(
      state.failed
        ? `${state.total - (state.failed - tooBig.length)} enviadas, ${state.failed} com erro.`
        : `${state.total} fotos enviadas. Agora marque os números de peito.`
    );
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function saveBibs(id: string, text: string) {
    startTransition(async () => {
      const r = await updateBibs(id, text);
      if (r && "bibs" in r && r.bibs) setPhotos((prev) => prev.map((x) => (x.id === id ? { ...x, bibs: r.bibs! } : x)));
      else setMsg(r?.error ?? "Não salvou.");
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const r = await deletePhoto(id);
      if (r?.error) setMsg(r.error);
      else setPhotos((prev) => prev.filter((x) => x.id !== id));
    });
  }

  function togglePublish() {
    const next = !published;
    setPub(next);
    startTransition(() => setPublished(p.eventId, next));
  }

  const missingBibs = photos.filter((x) => x.bibs.length === 0).length;

  return (
    <>
      <div className="panel" style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <b>{published ? "Álbum publicado" : "Álbum em rascunho"}</b>
          <div className="muted" style={{ fontSize: 14 }}>
            {photos.length} fotos · {missingBibs} sem número de peito
          </div>
        </div>
        {toIndex > 0 && (
          <button className="btn ghost small" onClick={indexFaces} disabled={indexing}>
            {indexing ? `Preparando… faltam ${toIndex}` : `Ativar busca por selfie (${toIndex} fotos)`}
          </button>
        )}
        {published && (
          <Link className="btn ghost small" href={`/eventos/${p.slug}`} target="_blank">
            Ver página pública
          </Link>
        )}
        <button className={`btn small${published ? " ghost" : ""}`} onClick={togglePublish} disabled={!photos.length}>
          {published ? "Despublicar" : "Publicar álbum"}
        </button>
      </div>

      <div
        className={`drop${over ? " over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <h3 style={{ fontSize: 20, marginBottom: 6 }}>Arraste as fotos do evento aqui</h3>
        <p className="muted" style={{ margin: "0 0 14px" }}>
          JPG ou PNG, até {MAX_MB} MB cada. A marca d&apos;água é aplicada sozinha. Treino de rua sem número de peito? Pode deixar o peito em branco: o corredor acha pela selfie.
        </p>
        <label className="btn ghost" htmlFor="files">
          Escolher arquivos
        </label>
        <input
          ref={inputRef}
          id="files"
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        {progress && (
          <>
            <div className="progress">
              <i style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            <p className="muted" style={{ margin: "8px 0 0", fontSize: 14 }}>
              Enviando {progress.done} de {progress.total}…
            </p>
          </>
        )}
      </div>
      {msg && (
        <p className="note" style={{ marginTop: 12 }}>
          {msg}
        </p>
      )}

      <div className="up-grid">
        {photos.map((ph) => (
          <div className="up" key={ph.id}>
            <img src={ph.previewUrl} alt="" loading="lazy" />
            <input
              defaultValue={ph.bibs.join(", ")}
              placeholder="Peitos: 101, 102"
              aria-label="Números de peito"
              onBlur={(e) => {
                if (e.target.value !== ph.bibs.join(", ")) saveBibs(ph.id, e.target.value);
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
            <div className="row">
              <span className="muted">{ph.bibs.length ? `${ph.bibs.length} marcado(s)` : "sem peito"}</span>
              <button className="linkbtn" onClick={() => remove(ph.id)}>
                Apagar
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
