"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function PixBox(p: { orderId: string; token: string; qrCode: string | null; qrBase64: string | null }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // Confere o pagamento a cada 5 segundos e recarrega quando aprovar
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(`/api/pedidos/${p.orderId}?t=${p.token}`, { cache: "no-store" });
        const d = await r.json();
        if (alive && d.status && d.status !== "pending") router.refresh();
      } catch {}
    };
    const id = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [p.orderId, p.token, router]);

  async function copy() {
    if (!p.qrCode) return;
    try {
      await navigator.clipboard.writeText(p.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      (document.getElementById("pixcode") as HTMLInputElement | null)?.select();
    }
  }

  if (!p.qrCode) {
    return <p className="err">O Pix deste pedido não foi gerado. Volte ao carrinho e tente de novo.</p>;
  }

  return (
    <>
      {p.qrBase64 && <img className="qr" src={`data:image/png;base64,${p.qrBase64}`} alt="QR Code do Pix" />}
      <div className="field">
        <label className="label" htmlFor="pixcode">
          Pix copia e cola
        </label>
        <div className="copybox">
          <input id="pixcode" readOnly value={p.qrCode} onFocus={(e) => e.currentTarget.select()} />
          <button className="btn small" type="button" onClick={copy}>
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>
      <p className="note">
        Abra o app do seu banco, escolha Pix e escaneie o QR ou cole o código. Esta página atualiza sozinha quando o
        pagamento cair.
      </p>
    </>
  );
}
