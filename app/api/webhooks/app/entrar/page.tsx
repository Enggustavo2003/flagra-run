"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(
    params.get("erro") === "nao-autorizado"
      ? "Este e-mail não está liberado como fotógrafo. Fale com o Flagra Run."
      : params.get("erro")
        ? "O link de acesso expirou. Peça um novo."
        : ""
  );
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("Digite um e-mail válido.");
      return;
    }
    setBusy(true);
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) setError("Não foi possível enviar o link agora. Tente de novo em um minuto.");
    else setSent(true);
  }

  return (
    <div className="wrap" style={{ paddingBlock: "48px 60px", maxWidth: 520 }}>
      <form className="panel form" onSubmit={submit} noValidate>
        <span className="label">Área do fotógrafo</span>
        <h1 style={{ fontSize: 30 }}>Entrar no painel</h1>
        {sent ? (
          <p>
            Enviamos um link de acesso para <b>{email}</b>. Abra o e-mail neste aparelho e clique no link.
          </p>
        ) : (
          <>
            <p className="muted" style={{ margin: 0 }}>
              Sem senha: você recebe um link de acesso no e-mail.
            </p>
            <div className="field">
              <label className="label" htmlFor="email">
                E-mail
              </label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {error && <p className="err">{error}</p>}
            <button className="btn" disabled={busy}>
              {busy ? "Enviando…" : "Receber link de acesso"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}

export default function Entrar() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
