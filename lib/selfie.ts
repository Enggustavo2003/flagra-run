import sharp from "sharp";

/** Converte a selfie (base64) num JPEG de até 1024 px. Devolve null se não for uma imagem válida. */
export async function normalizeSelfie(image: unknown): Promise<Buffer | null> {
  const b64 = typeof image === "string" ? image.replace(/^data:image\/\w+;base64,/, "") : "";
  if (!b64 || b64.length > 6_000_000) return null;
  try {
    return await sharp(Buffer.from(b64, "base64"))
      .rotate()
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
  } catch {
    return null;
  }
}
