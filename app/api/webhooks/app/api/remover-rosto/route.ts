import { NextResponse } from "next/server";
import { refreshEventStats } from "@/app/painel/actions";
import { faceSearchEnabled, NoFaceError, searchBySelfie } from "@/lib/faces";
import { removePhotoFaces } from "@/lib/faces-db";
import { previewUrl } from "@/lib/format";
import { normalizeSelfie } from "@/lib/selfie";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Pedido de remoção feito pelo próprio corredor.
 * Passo 1 (confirm=false): a selfie é comparada e mostramos as fotos encontradas.
 * Passo 2 (confirm=true): a selfie é comparada DE NOVO no servidor (o navegador não escolhe quais fotos),
 * as fotos encontradas somem da busca e da venda, e os rostos delas saem da coleção.
 * A selfie não é guardada em nenhum dos passos.
 */
export async function POST(req: Request) {
  if (!faceSearchEnabled()) {
    return NextResponse.json({ error: "A remoção por selfie ainda não está disponível." }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  if (body?.consent !== true) {
    return NextResponse.json({ error: "Marque a autorização para usarmos a selfie nesta busca." }, { status: 400 });
  }
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Digite um e-mail válido para registrarmos o pedido." }, { status: 400 });
  }
  const jpeg = await normalizeSelfie(body?.image);
  if (!jpeg) return NextResponse.json({ error: "Não conseguimos abrir essa imagem. Tente outra foto." }, { status: 400 });

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
    console.error("Rekognition search (remoção):", e);
    return NextResponse.json({ error: "A busca falhou agora. Tente de novo em instantes." }, { status: 502 });
  }

  const db = supabaseAdmin();
  const { data } = ids.length
    ? await db.from("photos").select("id, event_id, preview_path").in("id", ids).eq("hidden", false)
    : { data: [] as { id: string; event_id: string; preview_path: string }[] };
  const found = data ?? [];

  if (body?.confirm !== true) {
    return NextResponse.json({ photos: found.map((p) => ({ id: p.id, previewUrl: previewUrl(p.preview_path) })) });
  }
  if (!found.length) return NextResponse.json({ removed: 0 });

  const photoIds = found.map((p) => p.id);
  await db.from("photos").update({ hidden: true }).in("id", photoIds);
  for (const id of photoIds) await removePhotoFaces(id);
  await db.from("face_removals").insert({ email, photo_ids: photoIds });
  for (const ev of new Set(found.map((p) => p.event_id))) await refreshEventStats(ev);

  return NextResponse.json({ removed: photoIds.length });
}
