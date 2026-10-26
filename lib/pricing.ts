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

/**
 * Taxa do Pix do Asaas por pedido, em centavos (padrão R$ 1,99).
 * É descontada do repasse dos fotógrafos, junto com a comissão. Dá para mudar com PIX_FEE_CENTS.
 */
export function pixFeeCents() {
  const raw = process.env.PIX_FEE_CENTS;
  if (raw === undefined || raw.trim() === "") return 199;
  const v = Number(raw);
  return Number.isFinite(v) && v >= 0 ? Math.round(v) : 199;
}

/**
 * Divide a taxa do Pix do pedido entre os itens, proporcional ao valor de cada um.
 * Nenhum item paga mais do que sobra do repasse dele depois da comissão (o repasse nunca fica negativo);
 * se sobrar taxa, quem absorve é a plataforma.
 */
export function splitPixFee(sharesCents: number[], feePcts: number[], feeCents: number) {
  const raw = splitTotal(sharesCents, feeCents);
  return raw.map((f, i) => Math.min(f, Math.max(0, Math.floor((sharesCents[i] * (100 - feePcts[i])) / 100))));
}
