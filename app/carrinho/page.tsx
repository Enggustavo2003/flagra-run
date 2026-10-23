"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart";
import { brl } from "@/lib/format";
import { cleanPhone, formatPhone } from "@/lib/phone";
import { computeTotals, DISCOUNT_MIN_PHOTOS, DISCOUNT_PCT } from "@/lib/pricing";

export default function Carrinho() {
  const cart = useCart();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [optin, setOptin] = useState(false);
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const t = computeTotals(cart.items.map((i) => i.priceCents));

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setError("Preencha o nome e um e-mail válido para receber as fotos.");
      return;
    }
    if (!cleanPhone(phone)) {
      setError("Digite seu WhatsApp com DDD. É por ele que a gente te ajuda se algo der errado com o pedido.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoIds: cart.items.map((i) => i.id),
          name: name.trim(),
          email: email.trim(),
          phone,
          optin,
          cpf,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível criar o pedido.");
      cart.clear();
      router.push(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o pedido.");
      setBusy(false);
    }
  }

  if (!cart.items.length) {
    return (
      <div className="wrap" style={{ paddingBlock: "40px 60px" }}>
        <div className="empty">
          <h3>Seu carrinho está vazio</h3>
          <p>Busque pelo seu número de peito e adicione as fotos que quiser.</p>
          <Link className="btn" href="/">
            Buscar fotos
          </Link>
        </div>
      </div>
    );
  }

  const faltam = DISCOUNT_MIN_PHOTOS - cart.items.length;

  return (
    <div className="wrap two">
      <div className="panel">
        <h1 style={{ fontSize: 26, marginBottom: 6 }}>Carrinho</h1>
        <p className="muted" style={{ margin: "0 0 6px" }}>
          {faltam <= 0
            ? `Desconto de ${DISCOUNT_PCT}% aplicado por levar ${DISCOUNT_MIN_PHOTOS} ou mais fotos.`
            : `Leve mais ${faltam} e ganhe ${DISCOUNT_PCT}% de desconto.`}
        </p>
        <div>
          {cart.items.map((p) => (
            <div className="line" key={p.id}>
              <img src={p.previewUrl} alt="" />
              <div style={{ minWidth: 0 }}>
                <b>{p.eventName}</b>
                <div className="bibs" style={{ margin: "4px 0" }}>
                  {p.bibs.map((b) => (
                    <span key={b} className="bibchip">
                      {b}
                    </span>
                  ))}
                </div>
                <button className="linkbtn" onClick={() => cart.remove(p.id)}>
                  Remover
                </button>
              </div>
              <span className="mono">{brl(p.priceCents)}</span>
            </div>
          ))}
        </div>
      </div>

      <form className="panel form" onSubmit={pay} noValidate>
        <h2 style={{ fontSize: 24 }}>Pagamento</h2>
        <div className="field">
          <label className="label" htmlFor="nm">
            Nome
          </label>
          <input id="nm" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="em">
            E-mail
          </label>
          <input
            id="em"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="wa">
            WhatsApp
          </label>
          <input
            id="wa"
            className="mono"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(31) 99999-9999"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
          />
          <span className="muted" style={{ fontSize: 12 }}>
            Para te mandar o link das fotos e dar suporte no pedido.
          </span>
        </div>
        <div className="field">
          <label className="label" htmlFor="cpf">
            CPF
          </label>
          <input
            id="cpf"
            className="mono"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, "").slice(0, 11);
              setCpf(d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"));
            }}
          />
          <span className="muted" style={{ fontSize: 12 }}>
            O CPF é necessário para gerar o Pix.
          </span>
        </div>
        <label className="optin">
          <input type="checkbox" checked={optin} onChange={(e) => setOptin(e.target.checked)} />
          <span>Quero receber no WhatsApp aviso de álbuns novos e promoções. Dá para sair quando quiser.</span>
        </label>
        <div className="totals">
          <div>
            <span>Subtotal</span>
            <span className="mono">{brl(t.subtotal)}</span>
          </div>
          {t.discount > 0 && (
            <div style={{ color: "var(--ok)" }}>
              <span>Desconto</span>
              <span className="mono">− {brl(t.discount)}</span>
            </div>
          )}
          <div className="grand">
            <span>Total</span>
            <span className="mono">{brl(t.total)}</span>
          </div>
        </div>
        {error && <p className="err">{error}</p>}
        <button className="btn" disabled={busy}>
          {busy ? "Gerando o Pix…" : `Pagar ${brl(t.total)} no Pix`}
        </button>
        <p className="note">
          Depois do pagamento, as fotos em alta resolução ficam na página do pedido. Guarde o link dela. Ao pagar, você
          concorda com os <Link href="/termos">Termos de uso</Link>.
        </p>
      </form>
    </div>
  );
}
