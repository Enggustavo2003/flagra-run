import sharp from "sharp";

/**
 * Gera a prévia pública: reduz para no máximo 1600px e aplica a marca d'água
 * (o anel com ponto do logo repetido + faixas diagonais).
 * Usa só formas geométricas, sem texto, porque servidores como a Vercel
 * não têm fontes instaladas para o SVG.
 */
export async function makePreview(input: Buffer) {
  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer({ resolveWithObject: true });

  const W = info.width;
  const H = info.height;
  const tile = Math.round(Math.max(W, H) / 6);
  const r = tile * 0.2;

  let bands = "";
  const step = tile * 0.45;
  const bandW = Math.max(2, tile * 0.035);
  for (let i = -H; i < W + H; i += step) {
    bands += `<line x1="${i}" y1="0" x2="${i + H}" y2="${H}" stroke="#fff" stroke-opacity="0.13" stroke-width="${bandW}"/>`;
  }

  let marks = "";
  let row = 0;
  for (let y = -tile / 2; y < H + tile; y += tile * 0.8, row++) {
    const off = row % 2 ? tile / 2 : 0;
    for (let x = -tile; x < W + tile; x += tile) {
      const cx = (x + off).toFixed(1);
      const cy = y.toFixed(1);
      marks +=
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#000" stroke-opacity="0.18" stroke-width="${r * 0.42}"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="${r * 0.3}"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${r * 0.26}" fill="#fff" fill-opacity="0.5"/>`;
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${bands}${marks}</svg>`;
  const buffer = await sharp(data)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();

  // clean: a mesma imagem reduzida, sem marca d'água (usada só para indexar rostos; nunca é publicada)
  return { buffer, clean: data, width: W, height: H };
}
