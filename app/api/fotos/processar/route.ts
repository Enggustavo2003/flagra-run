import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { refreshEventStats } from "@/app/painel/actions";
import { emailAllowed } from "@/lib/auth";
import { indexAndRecord } from "@/lib/faces-db";
import { isUuid } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseForRequest } from "@/lib/supabase/request";
import { makePreview } from "@/lib/watermark";

export const runtime = "nodejs";
export const maxDuration = 60;

// Depois que o navegador sobe a foto original, gera a prévia com marca d'água e cadastra a foto.
export async function POST(req: Request) {
  // Site manda o cookie; o app Flagra Capture manda "Authorization: Bearer <token>"
  const { supabase, user } = await supabaseForRequest(req);
  if (!user || !emailAllowed(user.email)) return NextResponse.json({ error: "Faça login" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const eventId = body?.eventId;
  const path = body?.path;
  // Origem e tamanho escolhido no envio (só o app manda). "rapido" = 3000 px, "original" = arquivo cheio.
  const source = body?.source === "app" ? "app" : "site";
  const uploadSize = body?.size === "rapido" || body?.size === "original" ? body.size : null;
  if (!isUuid(eventId) || typeof path !== "string" || !path.startsWith(`${user.id}/${eventId}/`)) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  // O RLS garante que o evento é deste fotógrafo
  const { data: event } = await supabase.from("events").select("id").eq("id", eventId).maybeSingle();
  if (!event) return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });

  const admin = supabaseAdmin();
  const { data: file, error: dErr } = await admin.storage.from("originals").download(path);
  if (dErr || !file) return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });

  let preview;
  try {
    preview = await makePreview(Buffer.from(await file.arrayBuffer()));
  } catch {
    await admin.storage.from("originals").remove([path]);
    return NextResponse.json({ error: "Não é uma imagem válida" }, { status: 422 });
  }

  const photoId = crypto.randomUUID();
  const previewPath = `${eventId}/${photoId}.jpg`;
  const { error: uErr } = await admin.storage
    .from("previews")
    .upload(previewPath, preview.buffer, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (uErr) return NextResponse.json({ error: "Falha ao salvar a prévia" }, { status: 500 });

  const row = {
    id: photoId,
    event_id: eventId,
    original_path: path,
    preview_path: previewPath,
    width: preview.width,
    height: preview.height,
  };
  let { data: photo, error: iErr } = await admin
    .from("photos")
    .insert({ ...row, source, upload_size: uploadSize })
    .select("id, preview_path, bibs")
    .single();
  // Banco ainda sem a migracao-captura.sql: cadastra sem os campos novos
  if (iErr && (iErr.code === "PGRST204" || iErr.code === "42703")) {
    ({ data: photo, error: iErr } = await admin.from("photos").insert(row).select("id, preview_path, bibs").single());
  }
  if (iErr || !photo) return NextResponse.json({ error: "Falha ao cadastrar a foto" }, { status: 500 });

  // busca por selfie: indexa os rostos na versão limpa (só quando FACE_SEARCH=1)
  await indexAndRecord(photoId, preview.clean);
  await refreshEventStats(eventId);
  return NextResponse.json({ photo });
}
