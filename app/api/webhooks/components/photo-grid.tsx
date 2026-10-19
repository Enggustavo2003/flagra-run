"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { brl } from "@/lib/format";
import { computeTotals } from "@/lib/pricing";
import { useCart, type CartItem } from "./cart";

export function PhotoGrid({ photos }: { photos: CartItem[] }) {
  const cart = useCart();
  const [open, setOpen] = useState<CartItem | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const totals = computeTotals(cart.items.map((i) => i.priceCents));
  const missing = photos.filter((p) => !cart.has(p.id));

  return (
    <>
      <div className="grid">
        {photos.map((p) => {
          const sel = cart.has(p.id);
          return (
            <div key={p.id} className={`ph${sel ? " sel" : ""}`}>
              <img
                src={p.previewUrl}
                alt={p.bibs.length ? `Foto com os peitos ${p.bibs.join(", ")}` : "Foto do evento"}
                loading="lazy"
                onClick={() => setOpen(p)}
              />
              <div className="bar">
                <div className="bibs">
                  {p.bibs.map((b) => (
                    <span key={b} className="bibchip">
                      {b}
                    </span>
                  ))}
                </div>
                <button className="add" onClick={() => cart.toggle(p)}>
                  {sel ? "No carrinho" : `+ ${brl(p.priceCents)}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dock">
        <div className="wrap">
          <div className="sum">
            <span className="label" style={{ color: "inherit", opacity: 0.7 }}>
              Carrinho
            </span>
            <b>
              {cart.items.length} {cart.items.length === 1 ? "foto" : "fotos"} · {brl(totals.total)}
            </b>
          </div>
          <div className="actions">
            {missing.length > 0 && photos.length > 1 && (
              <button className="btn ghost" onClick={() => cart.addMany(missing)}>
                Adicionar todas desta lista
              </button>
            )}
            {cart.items.length > 0 ? (
              <Link className="btn" href="/carrinho">
                Finalizar compra
              </Link>
            ) : (
              <button className="btn" disabled>
                Finalizar compra
              </button>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="lb" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          <button className="close" onClick={() => setOpen(null)} autoFocus>
            Fechar
          </button>
          <img src={open.previewUrl} alt="" />
          <div className="cap">
            <span>{open.eventName}</span>
            <span className="bibs">
              {open.bibs.map((b) => (
                <span key={b} className="bibchip">
                  {b}
                </span>
              ))}
            </span>
            <button className="btn small" onClick={() => cart.toggle(open)}>
              {cart.has(open.id) ? "Tirar do carrinho" : `Adicionar · ${brl(open.priceCents)}`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
