export const CATEGORIES = ["Corrida", "Ciclismo", "Funcional", "Triathlon", "Trail", "Outros"] as const;

export function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(iso: string, month: "short" | "long" = "short") {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month,
    year: "numeric",
  });
}

export function previewUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/previews/${path}`;
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/** "101, 102 103" -> [101, 102, 103] */
export function parseBibs(text: string) {
  return [...new Set(text.split(/[^0-9]+/).filter(Boolean).map(Number))]
    .filter((n) => n > 0 && n < 1_000_000)
    .slice(0, 20);
}

export const isUuid = (s: unknown): s is string =>
  typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
