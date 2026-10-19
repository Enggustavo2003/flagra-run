"use client";
import { useActionState, useState } from "react";
import { registerPayout, type PayoutState } from "@/app/admin/actions";

export function PayoutForm({ photographerId, balance }: { photographerId: string; balance: number }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<PayoutState, FormData>(registerPayout, {});
  if (state.ok) return <span style={{ color: "var(--ok)", fontSize: 13 }}>Repasse registrado</span>;
  if (!open)
    return (
      <button type="button" className="linkbtn" onClick={() => setOpen(true)}>
        Registrar repasse
      </button>
    );
  return (
    <form action={action} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <input type="hidden" name="photographer_id" value={photographerId} />
      <input
        name="amount"
        className="mono"
        inputMode="decimal"
        aria-label="Valor pago"
        defaultValue={balance > 0 ? (balance / 100).toFixed(2).replace(".", ",") : ""}
        style={{ width: 96, border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 8px", background: "var(--surface)" }}
      />
      <input
        name="note"
        aria-label="Observação"
        placeholder="obs. (opcional)"
        style={{ width: 130, border: "1.5px solid var(--line)", borderRadius: 8, padding: "6px 8px", background: "var(--surface)" }}
      />
      <button className="btn small" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
      {state.error && <span className="err" style={{ fontSize: 13 }}>{state.error}</span>}
    </form>
  );
}
