"use client";
import Link from "next/link";
import { useRef, useState } from "react";

const ENABLED = process.env.NEXT_PUBLIC_FACE_SEARCH === "1";

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

type Found = { id: string; previewUrl: string };

export default function RemoverRosto() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [found, setFound] = useState<Found[] | null>(null);
  const [removed, setRemoved] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function call(img: string, confirm: boolean) {
    const res = await fetch("/api/remover-rosto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: img, consent: true, email, confirm }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Não deu certo. Tente de novo.");
    return data;
  }

  async function onFile(file?: File) {
    if (!file) return;
    setError("");
    if (!consent || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("Preencha o e-mail e marque a autorização antes de enviar a selfie.");
      return;
    }
    setBusy(true);
    try {
      const img = await shrink(file);
      setImage(img);
      const data = await call(img, false);
      setFound(data.photos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não deu certo. Tente de novo.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function confirmRemoval() {
    if (!image) return;
    setBusy(true);
    setError("");
    try {
      const data = await call(image, true);
      setRemoved(data.removed);
      setImage(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não deu certo. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  if (!ENABLED) {
    return (
      <div className="wrap" style={{ paddingBlock: "48px 60px", maxWidth: 640 }}>
        <div className="panel form">
          <h1 style={{ fontSize: 30 }}>Remover minhas fotos</h1>
          <p className="muted" style={{ margin: 0 }}>
            Quer tirar uma foto sua do WOD Fotos? Fale com a gente pelo Instagram @wodfotos com o link da foto. A
            gente tira do ar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ paddingBlock: "32px 60px", maxWidth: 760 }}>
      <div className="panel form">
        <span className="label">Privacidade</span>
        <h1 style={{ fontSize: 32 }}>Remover minhas fotos</h1>

        {removed !== null ? (
          <>
            <p style={{ margin: 0 }}>
              {removed
                ? `Pronto. ${removed} ${removed === 1 ? "foto saiu" : "fotos saíram"} da busca e da venda, e o seu rosto não aparece mais nelas.`
                : "Não encontramos fotos suas no WOD Fotos."}
            </p>
            <Link className="btn ghost" href="/">
              Voltar para o início
            </Link>
          </>
        ) : found ? (
          <>
            <p style={{ margin: 0 }}>
              {found.length
                ? `Encontramos ${found.length} ${found.length === 1 ? "foto" : "fotos"} em que você aparece.`
                : "Não encontramos fotos suas no WOD Fotos. Se achar alguma, tente com outra selfie ou fale com a gente pelo Instagram @wodfotos."}
            </p>
            {found.length > 0 && (
              <>
                <div className="up-grid">
                  {found.map((p) => (
                    <div className="up" key={p.id}>
                      <img src={p.previewUrl} alt="" loading="lazy" />
                    </div>
                  ))}
                </div>
                <p className="note">
                  Ao confirmar, essas fotos saem da busca e da venda, e o seu rosto é apagado do índice de busca
                  facial. Quem já comprou uma delas continua com a cópia que baixou.
                </p>
                {error && <p className="err">{error}</p>}
                <button className="btn" onClick={confirmRemoval} disabled={busy}>
                  {busy ? "Removendo…" : "Remover essas fotos"}
                </button>
              </>
            )}
            <button className="linkbtn" onClick={() => setFound(null)}>
              Tentar com outra selfie
            </button>
          </>
        ) : (
          <>
            <p className="muted" style={{ margin: 0 }}>
              Mande uma selfie. A gente procura as fotos em que você aparece e você escolhe tirá-las do site.
            </p>
            <div className="field">
              <label className="label" htmlFor="em">
                Seu e-mail
              </label>
              <input id="em" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <label
              className="note"
              style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", border: "1.5px solid var(--accent)" }}
            >
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                style={{ marginTop: 3, width: 18, height: 18, flex: "none" }}
              />
              <span style={{ color: "var(--ink)" }}>
                <b>Autorizo o uso da minha selfie para reconhecimento facial</b>, só para encontrar e remover minhas
                fotos. A selfie é descartada depois da busca. Guardamos só o e-mail e a lista das fotos removidas, como
                registro do pedido.
              </span>
            </label>
            {error && <p className="err">{error}</p>}
            <label className="btn" htmlFor="selfie" style={{ opacity: busy ? 0.45 : 1 }}>
              {busy ? "Procurando suas fotos…" : "Tirar ou escolher selfie"}
            </label>
            <input
              ref={inputRef}
              id="selfie"
              type="file"
              accept="image/*"
              capture="user"
              hidden
              disabled={busy}
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </>
        )}
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Veja a nossa <Link href="/privacidade">política de privacidade</Link>.
        </p>
      </div>
    </div>
  );
}
