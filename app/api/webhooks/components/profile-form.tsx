"use client";
import { useActionState, useState } from "react";
import { updateProfile, type FormState } from "@/app/painel/actions";
import { CATEGORIES } from "@/lib/format";
import { formatPhone } from "@/lib/phone";

type Profile = { name: string; whatsapp: string | null; instagram: string | null; modalities: string[] };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState<FormState & { ok?: boolean }, FormData>(updateProfile, {});
  const [phone, setPhone] = useState(profile.whatsapp ? formatPhone(profile.whatsapp) : "");
  const incomplete = !profile.whatsapp;
  return (
    <form className="panel form" action={action} style={{ marginTop: 12, ...(incomplete ? { borderColor: "var(--bib)" } : {}) }}>
      <span className="label">Seu perfil</span>
      {incomplete && (
        <p className="muted" style={{ margin: 0 }}>
          Complete para a gente te avisar de provas e falar com você sobre suas vendas.
        </p>
      )}
      <div className="field">
        <label className="label" htmlFor="pf-name">Nome ou estúdio</label>
        <input id="pf-name" name="name" defaultValue={profile.name} />
      </div>
      <div className="field">
        <label className="label" htmlFor="pf-wa">WhatsApp</label>
        <input
          id="pf-wa"
          name="whatsapp"
          className="mono"
          type="tel"
          inputMode="tel"
          placeholder="(31) 99999-9999"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="pf-ig">Instagram</label>
        <input id="pf-ig" name="instagram" placeholder="@seuperfil" defaultValue={profile.instagram ? `@${profile.instagram}` : ""} />
      </div>
      <div className="field">
        <span className="label">O que você fotografa</span>
        <div className="checks">
          {CATEGORIES.map((c) => (
            <label key={c}>
              <input type="checkbox" name="modalities" value={c} defaultChecked={profile.modalities.includes(c)} /> {c}
            </label>
          ))}
        </div>
      </div>
      {state.error && <p className="err">{state.error}</p>}
      {state.ok && <p style={{ margin: 0, color: "var(--ok)" }}>Perfil salvo.</p>}
      <button className="btn ghost" disabled={pending}>
        {pending ? "Salvando…" : "Salvar perfil"}
      </button>
    </form>
  );
}
