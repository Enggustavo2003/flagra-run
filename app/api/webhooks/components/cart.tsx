"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  id: string;
  previewUrl: string;
  bibs: number[];
  priceCents: number;
  eventName: string;
};

type Cart = {
  items: CartItem[];
  has: (id: string) => boolean;
  toggle: (item: CartItem) => void;
  addMany: (items: CartItem[]) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const KEY = "flagra-run-cart";
const CartCtx = createContext<Cart | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  const save = useCallback((next: CartItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const value = useMemo<Cart>(
    () => ({
      items,
      has: (id) => items.some((i) => i.id === id),
      toggle: (item) =>
        save(items.some((i) => i.id === item.id) ? items.filter((i) => i.id !== item.id) : [...items, item]),
      addMany: (add) => save([...items, ...add.filter((a) => !items.some((i) => i.id === a.id))]),
      remove: (id) => save(items.filter((i) => i.id !== id)),
      clear: () => save([]),
    }),
    [items, save]
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart fora do CartProvider");
  return c;
}

export function CartCount() {
  const { items } = useCart();
  return <span className="cart-count">{items.length}</span>;
}
