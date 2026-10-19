import { NextResponse } from "next/server";
import sharp from "sharp";
import { emailAllowed } from "@/lib/auth";
import { faceSearchEnabled } from "@/lib/faces";
import { indexAndRecord } from "@/lib/faces-db";
import { isUuid } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH = 8;

// Indexa os rostos das fotos de um álbum que ainda não foram indexadas (ex.: álbuns enviados antes da busca por selfie).
// O painel chama em lotes até "remaining" chegar a zero.
export async function POST(req: Request) {
  if (!faceSearchEnabled()) return NextResponse.json({ error: "Busca por selfie desligada" }, { status: 503 });

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !emailAllowed(user.email)) return NextResponse.json({ error: "Faça login" }, { status: 401 });

  const { eventId } = (await req.json().catch(() => ({}))) as { eventId?: string };
  if (!isUuid(eventId)) return NextResponse.json({ error: "Álbum inválido" }, { status: 400 });

  // O RLS garante que o álbum é deste fotógrafo
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("photographer_id", user.id)
    .maybeSingle();
  if (!event) return NextResponse.json({ error: "Álbum não encontrado" }, { status: 404 });

  const admin = supabaseAdmin();
  const { data: batch } = await admin
    .from("photos")
    .select("id, original_path")
    .eq("event_id", eventId)
    .eq("faces_indexed", false)
    .order("created_at")
    .limit(BATCH);

  let failed = 0;
  for (const p of batch ?? []) {
    const { data: file } = await admin.storage.from("originals").download(p.original_path);
    if (!file) {
      failed++;
      continue;
    }
    const clean = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    if ((await indexAndRecord(p.id, clean)) < 0) failed++;
  }

  const { count } = await admin
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("faces_indexed", false);

  return NextResponse.json({ done: (batch?.length ?? 0) - failed, failed, remaining: count ?? 0 });
}
