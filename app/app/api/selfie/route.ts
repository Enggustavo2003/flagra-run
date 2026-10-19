import { NextResponse } from "next/server";
import sharp from "sharp";
import { faceSearchEnabled, NoFaceError, searchBySelfie } from "@/lib/faces";
import { isUuid, previewUrl } from "@/lib/format";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// Recebe a selfie, compara com os rostos indexados e devolve as fotos.
// A selfie fica só na memória durante a busca: não é salva em lugar nenhum.
export async function POST(req: Request) {
  if (!faceSearchEnabled()) {
    return NextResponse.json({ error: "A busca por selfie ainda não está disponível." }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  if (body?.consent !== true) {
    return NextResponse.json({ error: "Para buscar pela selfie, marque a autorização." }, { status: 400 });
  }
  const b64 = typeof body?.image === "string" ? body.image.replace(/^data:image\/\w+;base64,/, "") : "";
  if (!b64 || b64.length > 6_000_000) {
    return NextResponse.json({ error: "Envie uma foto de até 4 MB." }, { status: 400 });
  }

  let jpeg: Buffer;
  try {
    jpeg = await sharp(Buffer.from(b64, "base64"))
      .rotate()
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "Não conseguimos abrir essa imagem. Tente outra foto." }, { status: 400 });
  }

  let ids: string[];
  try {
    ids = (await searchBySelfie(jpeg)).slice(0, 500);
  } catch (e) {
    if (e instanceof NoFaceError) {
      return NextResponse.json(
        { error: "Não achamos um rosto na selfie. Tire de frente, com boa luz e sem óculos escuros." },
        { status: 422 }
      );
    }
    console.error("Rekognition search:", e);
    return NextResponse.json({ error: "A busca falhou agora. Tente de novo em instantes." }, { status: 502 });
  }
  if (!ids.length) return NextResponse.json({ photos: [] });

  // O RLS só devolve fotos de álbuns publicados
  const supabase = await supabaseServer();
  let q = supabase
    .from("photos")
    .select("id, preview_path, bibs, event_id, events!inner(name, price_cents, published, photographer_id)")
    .in("id", ids)
    .eq("events.published", true);
  if (isUuid(body?.eventId)) q = q.eq("event_id", body.eventId);
  const { data } = await q;

  const byId = new Map((data ?? []).map((p: any) => [p.id, p]));
  const photos = ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((p: any) => ({
      id: p.id,
      previewUrl: previewUrl(p.preview_path),
      bibs: p.bibs,
      priceCents: p.events.price_cents,
      eventName: p.events.name,
    }));
  return NextResponse.json({ photos });
}
