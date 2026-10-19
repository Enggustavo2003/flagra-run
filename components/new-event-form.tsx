"use client";
import { useActionState } from "react";
import { createEvent, type FormState } from "@/app/painel/actions";
import { CATEGORIES } from "@/lib/format";

export function NewEventForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createEvent, {});
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form className="panel form" action={action}>
      <span className="label">Painel do fotógrafo</span>
      <h2 style={{ fontSize: 24 }}>Novo álbum</h2>
      <div className="field">
        <label className="label" htmlFor="name">
          Nome do evento
        </label>
        <input id="name" name="name" placeholder="ex.: Corrida do Mineirão 10K" required />
      </div>
      <div className="field">
        <label className="label" htmlFor="city">
          Cidade
        </label>
        <input id="city" name="city" defaultValue="Belo Horizonte, MG" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div className="field">
          <label className="label" htmlFor="date">
            Data
          </label>
          <input id="date" name="date" type="date" defaultValue={today} required />
        </div>
        <div className="field">
          <label className="label" htmlFor="price">
            Preço (R$)
          </label>
          <input id="price" name="price" className="mono" inputMode="decimal" defaultValue="9,90" required />
        </div>
      </div>
      <div className="field">
        <label className="label" htmlFor="category">
          Categoria
        </label>
        <select id="category" name="category">
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      {state.error && <p className="err">{state.error}</p>}
      <button className="btn" disabled={pending}>
        {pending ? "Criando…" : "Criar álbum"}
      </button>
    </form>
  );
}
