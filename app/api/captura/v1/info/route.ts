import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * O app consulta ao abrir. Se a versão dele for menor que `minVersion`,
 * mostra "Atualize o app" com o link. Suba `CAPTURE_MIN_VERSION` na Vercel
 * só quando uma mudança no site quebrar APKs antigos.
 */
export async function GET() {
  return NextResponse.json(
    {
      api: 1,
      minVersion: process.env.CAPTURE_MIN_VERSION || "1.0.0",
      downloadUrl: process.env.CAPTURE_DOWNLOAD_URL || null,
    },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
