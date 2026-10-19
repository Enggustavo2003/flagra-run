import { deleteFaces, faceSearchEnabled, indexPhotoFaces } from "./faces";
import { supabaseAdmin } from "./supabase/admin";

/** Indexa os rostos de uma foto e guarda os FaceIds. Nunca derruba o upload: em erro, só registra no log. */
export async function indexAndRecord(photoId: string, cleanJpeg: Buffer) {
  if (!faceSearchEnabled()) return 0;
  try {
    const faceIds = await indexPhotoFaces(photoId, cleanJpeg);
    const db = supabaseAdmin();
    if (faceIds.length) {
      await db.from("photo_faces").insert(faceIds.map((face_id) => ({ face_id, photo_id: photoId })));
    }
    await db.from("photos").update({ faces_indexed: true }).eq("id", photoId);
    return faceIds.length;
  } catch (e) {
    console.error("Rekognition index:", e);
    return -1;
  }
}

/** Apaga da coleção os rostos de uma foto (antes de apagar a foto). */
export async function removePhotoFaces(photoId: string) {
  const db = supabaseAdmin();
  const { data } = await db.from("photo_faces").select("face_id").eq("photo_id", photoId);
  const ids = (data ?? []).map((r) => r.face_id as string);
  if (!ids.length) return;
  try {
    await deleteFaces(ids);
  } catch (e) {
    console.error("Rekognition delete:", e);
  }
  await db.from("photo_faces").delete().eq("photo_id", photoId);
}
