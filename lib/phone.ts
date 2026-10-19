/** WhatsApp brasileiro: devolve DDD + número (10 ou 11 dígitos) ou null. Aceita +55 na frente. */
export function cleanPhone(input: string) {
  let d = input.replace(/\D/g, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return null;
  if (d[0] === "0" || d[2] === "0") return null;
  if (d.length === 11 && d[2] !== "9") return null;
  return d;
}

/** (31) 99999-9999 */
export function formatPhone(d: string) {
  const s = d.replace(/\D/g, "").slice(0, 11);
  if (s.length <= 2) return s.length ? `(${s}` : "";
  if (s.length <= 6) return `(${s.slice(0, 2)}) ${s.slice(2)}`;
  if (s.length <= 10) return `(${s.slice(0, 2)}) ${s.slice(2, 6)}-${s.slice(6)}`;
  return `(${s.slice(0, 2)}) ${s.slice(2, 7)}-${s.slice(7)}`;
}

/** Link wa.me com mensagem pronta. */
export function whatsappLink(phone: string, text: string) {
  return `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`;
}
