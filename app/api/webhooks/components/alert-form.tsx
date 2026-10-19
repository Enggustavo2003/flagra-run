"use client";
import { useState } from "react";
import { cleanPhone, formatPhone } from "@/lib/phone";

export function AlertForm({ bib }: { bib: number }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [optin, setOptin] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!cleanPhone(phone)) return setError("Digite seu WhatsApp com DDD.");
    setState("busy");
    const res = await fetch("/api/avisos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, bib, optin }),
    }).catch(() => null);
    if (res?.ok) return setState("done");
    const data = await res?.json().catch(() => null);
    setError(data?.error ?? "Não deu para salvar agora. Tente de novo.");
    setState("idle");
  }

  if (state === "done") {
    return (
      <div className="panel alert-box">
        <h3 style={{ margin: 0 }}>Combinado.</h3>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          Assim que as fotos do peito {bib} subirem, a gente te chama no WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <form className="panel form alert-box" onSubmit={submit} noValidate>
      <div>
        <h3 style={{ margin: 0 }}>Avisa quando minhas fotos chegarem</h3>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          O fotógrafo pode ainda estar subindo o álbum. Deixe seu WhatsApp e a gente te chama quando aparecer foto do peito {bib}.
        </p>
      </div>
      <div className="field">
        <label className="label" htmlFor="al-nm">Nome</label>
        <input id="al-nm" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label className="label" htmlFor="al-wa">WhatsApp</label>
        <input
          id="al-wa"
          className="mono"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(31) 99999-9999"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
        />
      </div>
      <label className="optin">
        <input type="checkbox" checked={optin} onChange={(e) => setOptin(e.target.checked)} />
        <span>Também quero saber de álbuns novos e promoções. Dá para sair quando quiser.</span>
      </label>
      {error && <p className="err">{error}</p>}
      <button className="btn" disabled={state === "busy"}>
        {state === "busy" ? "Salvando…" : "Me avise"}
      </button>
    </form>
  );
}
