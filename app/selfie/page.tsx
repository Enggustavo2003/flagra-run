"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import type { CartItem } from "@/components/cart";
import { PhotoGrid } from "@/components/photo-grid";

const ENABLED = process.env.NEXT_PUBLIC_FACE_SEARCH === "1";

/** Reduz a foto no próprio celular antes de enviar (máx. 1024 px). */
function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, 1024 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.88));
    };
    img.onerror = () => reject(new Error("Não conseguimos abrir essa imagem."));
    img.src = url;
  });
}

function SelfieInner() {
  const params = useSearchParams();
  const album = params.get("album");
  const albumName = params.get("nome");
  const [consent, setConsent] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<CartItem[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file?: File) {
    if (!file) return;
    setError("");
    setResults(null);
    if (!consent) {
      setError("Marque a autorização antes de enviar a selfie.");
      return;
    }
    setBusy(true);
    try {
      const image = await shrink(file);
      setPreview(image);
      const res = await fetch("/api/selfie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, consent: true, eventId: album || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "A busca falhou. Tente de novo.");
      setResults(data.photos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "A busca falhou. Tente de novo.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (!ENABLED) {
    return (
      <div className="wrap" style={{ paddingBlock: "48px 60px" }}>
        <div className="empty">
          <h3>Busca por selfie em breve</h3>
          <p>Enquanto isso, busque pelo seu número de peito.</p>
          <Link className="btn" href="/">
            Buscar pelo número
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 28 }}>
      {!results && (
        <div className="two" style={{ paddingTop: 0 }}>
          <div className="panel form">
            <span className="label">Busca por selfie</span>
            <h1 style={{ fontSize: 32 }}>{albumName ? `Ache suas fotos em ${albumName}` : "Ache suas fotos pelo rosto"}</h1>
            <p className="muted" style={{ margin: 0 }}>
              Tire uma selfie de frente, com boa luz e sem óculos escuros. A gente compara com as fotos dos álbuns
              publicados e mostra só as suas.
            </p>

            <label className="note" style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", border: "1.5px solid var(--accent)" }}>
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                style={{ marginTop: 3, width: 18, height: 18, flex: "none" }}
              />
              <span style={{ color: "var(--ink)" }}>
                <b>Autorizo o uso da minha selfie para reconhecimento facial</b>, só para encontrar minhas fotos agora.
                A selfie é comparada e descartada em seguida: o WOD Fotos não guarda a imagem nem os dados do meu
                rosto. <Link href="/privacidade">Política de privacidade</Link>.
              </span>
            </label>

            {error && <p className="err">{error}</p>}
            <label className={`btn${!consent || busy ? " disabled" : ""}`} htmlFor="selfie" style={{ opacity: !consent || busy ? 0.45 : 1 }}>
              {busy ? "Procurando suas fotos…" : "Tirar ou escolher selfie"}
            </label>
            <input
              ref={inputRef}
              id="selfie"
              type="file"
              accept="image/*"
              capture="user"
              hidden
              disabled={!consent || busy}
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Prefere não usar o rosto? <Link href="/">Busque pelo número de peito</Link>.
            </p>
          </div>
          <div className="dark-card" style={{ alignItems: "center", justifyContent: "center", minHeight: 260 }}>
            {preview ? (
              <img src={preview} alt="Sua selfie" style={{ maxHeight: 320, borderRadius: 12 }} />
            ) : (
              <p style={{ textAlign: "center" }}>Sua selfie aparece aqui só durante a busca.</p>
            )}
          </div>
        </div>
      )}

      {results && (
        <>
          <div className="ev-head" style={{ paddingTop: 0 }}>
            <div>
              <span className="label">Busca por selfie</span>
              <h1>
                {results.length
                  ? `${results.length} ${results.length === 1 ? "foto encontrada" : "fotos encontradas"}`
                  : "Nenhuma foto encontrada"}
              </h1>
            </div>
            <button className="btn ghost small" onClick={() => setResults(null)}>
              Nova selfie
            </button>
          </div>
          {results.length ? (
            <PhotoGrid photos={results} />
          ) : (
            <div className="empty" style={{ marginBottom: 60 }}>
              <h3>Não achamos você nos álbuns publicados</h3>
              Tente outra selfie, de frente e com boa luz, ou busque pelo número de peito.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Selfie() {
  return (
    <Suspense>
      <SelfieInner />
    </Suspense>
  );
}
