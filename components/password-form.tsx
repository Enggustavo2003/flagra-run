"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setMsg({ text: "Use pelo menos 8 caracteres." });
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return setMsg({ text: "Misture letras e números." });
    if (password !== confirm) return setMsg({ text: "As duas senhas estão diferentes." });
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (error) return setMsg({ text: "Não deu para salvar. Saia, entre de novo pelo link no e-mail e tente outra vez." });
    setPassword("");
    setConfirm("");
    setMsg({ ok: true, text: "Senha salva. Da próxima vez, entre com e-mail e senha." });
  }

  return (
    <form className="panel form" onSubmit={submit} style={{ marginTop: 12 }} noValidate>
      <span className="label">Senha de acesso</span>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>Crie ou troque a senha para entrar sem esperar o e-mail.</p>
      <div className="field">
        <label className="label" htmlFor="pw-new">Nova senha</label>
        <input id="pw-new" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="field">
        <label className="label" htmlFor="pw-confirm">Repita a senha</label>
        <input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      {msg && <p className={msg.ok ? undefined : "err"} style={msg.ok ? { margin: 0, color: "var(--ok)" } : undefined}>{msg.text}</p>}
      <button className="btn ghost" disabled={busy}>{busy ? "Salvando…" : "Salvar senha"}</button>
    </form>
  );
}
