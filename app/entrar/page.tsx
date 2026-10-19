"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

function safeNext(v: string | null) {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/painel";
}

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const next = safeNext(params.get("next"));
  const [mode, setMode] = useState<"senha" | "link">("senha");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError("Digite um e-mail válido.");
    setBusy(true);
    const auth = supabaseBrowser().auth;
    if (mode === "senha") {
      if (password.length < 8) {
        setBusy(false);
        return setError("A senha tem pelo menos 8 caracteres.");
      }
      const { error } = await auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setBusy(false);
        return setError("E-mail ou senha não conferem. Se ainda não criou uma senha, entre pelo link no e-mail.");
      }
      router.replace(next);
      router.refresh();
      return;
    }
    const { error } = await auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
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
            <div className="chips" role="tablist">
              <button type="button" className="chip" aria-current={mode === "senha" ? "true" : undefined} onClick={() => setMode("senha")}>
                Com senha
              </button>
              <button type="button" className="chip" aria-current={mode === "link" ? "true" : undefined} onClick={() => setMode("link")}>
                Link no e-mail
              </button>
            </div>
            <div className="field">
              <label className="label" htmlFor="email">E-mail</label>
              <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {mode === "senha" ? (
              <div className="field">
                <label className="label" htmlFor="password">Senha</label>
                <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            ) : (
              <p className="muted" style={{ margin: 0 }}>Sem senha: você recebe um link de acesso no e-mail.</p>
            )}
            {error && <p className="err">{error}</p>}
            <button className="btn" disabled={busy}>
              {busy ? "Entrando…" : mode === "senha" ? "Entrar" : "Receber link de acesso"}
            </button>
            {mode === "senha" && (
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                Primeira vez ou esqueceu a senha? Entre pelo <b>link no e-mail</b> e crie a senha no painel.
              </p>
            )}
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
