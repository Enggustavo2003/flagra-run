"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "flagra-cookies-ok";

/** Aviso simples: o site só usa o que é essencial. Não bloqueia nada e não rastreia. */
export function CookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  function ok() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setShow(false);
  }

  return (
    <div className="cookie-notice" role="region" aria-label="Aviso de cookies">
      <p>
        Usamos só o essencial para o site funcionar (login e carrinho). Sem anúncios e sem rastreamento.{" "}
        <Link href="/cookies">Saiba mais</Link>
      </p>
      <button type="button" className="btn" onClick={ok}>
        Entendi
      </button>
    </div>
  );
}
