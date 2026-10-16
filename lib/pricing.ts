/** Regra de desconto: a partir de 3 fotos no mesmo pedido, 20% off. */
export const DISCOUNT_MIN_PHOTOS = 3;
export const DISCOUNT_PCT = 20;

export function computeTotals(pricesCents: number[]) {
  const subtotal = pricesCents.reduce((s, p) => s + p, 0);
  const discount =
    pricesCents.length >= DISCOUNT_MIN_PHOTOS ? Math.round((subtotal * DISCOUNT_PCT) / 100) : 0;
  return { subtotal, discount, total: subtotal - discount };
}

/** Divide o total do pedido entre as fotos, proporcional ao preço (para o repasse). */
export function splitTotal(pricesCents: number[], totalCents: number) {
  const subtotal = pricesCents.reduce((s, p) => s + p, 0);
  const shares = pricesCents.map((p) => Math.floor((p * totalCents) / subtotal));
  let rest = totalCents - shares.reduce((s, p) => s + p, 0);
  for (let i = 0; rest > 0; i = (i + 1) % shares.length, rest--) shares[i]++;
  return shares;
}
