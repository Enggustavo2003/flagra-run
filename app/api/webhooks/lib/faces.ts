import {
  CreateCollectionCommand,
  DeleteFacesCommand,
  IndexFacesCommand,
  RekognitionClient,
  SearchFacesByImageCommand,
} from "@aws-sdk/client-rekognition";

/**
 * Busca por selfie com Amazon Rekognition.
 * - Na hora do upload, os rostos de cada foto do álbum são indexados (ExternalImageId = id da foto).
 * - Na busca, a selfie é comparada com a coleção e DESCARTADA: não guardamos a selfie nem a biometria dela.
 * Fica desligada até FACE_SEARCH=1.
 */

export const faceSearchEnabled = () => process.env.FACE_SEARCH === "1";

const COLLECTION = () => process.env.REKOGNITION_COLLECTION || "flagra-run";
let client: RekognitionClient | null = null;
function rk() {
  if (!client) client = new RekognitionClient({ region: process.env.AWS_REGION || "sa-east-1" });
  return client;
}

async function ensureCollection() {
  try {
    await rk().send(new CreateCollectionCommand({ CollectionId: COLLECTION() }));
  } catch (e: any) {
    if (e?.name !== "ResourceAlreadyExistsException") throw e;
  }
}

/** Indexa os rostos de uma foto (imagem limpa, sem marca d'água, até 5 MB). Devolve os FaceIds. */
export async function indexPhotoFaces(photoId: string, jpeg: Buffer): Promise<string[]> {
  const cmd = () =>
    new IndexFacesCommand({
      CollectionId: COLLECTION(),
      Image: { Bytes: jpeg },
      ExternalImageId: photoId,
      MaxFaces: 15,
      QualityFilter: "AUTO",
    });
  try {
    const r = await rk().send(cmd());
    return (r.FaceRecords ?? []).map((f) => f.Face?.FaceId).filter((x): x is string => !!x);
  } catch (e: any) {
    if (e?.name !== "ResourceNotFoundException") throw e;
    await ensureCollection();
    const r = await rk().send(cmd());
    return (r.FaceRecords ?? []).map((f) => f.Face?.FaceId).filter((x): x is string => !!x);
  }
}

export async function deleteFaces(faceIds: string[]) {
  for (let i = 0; i < faceIds.length; i += 1000) {
    await rk().send(new DeleteFacesCommand({ CollectionId: COLLECTION(), FaceIds: faceIds.slice(i, i + 1000) }));
  }
}

export class NoFaceError extends Error {}

/** Compara a selfie com a coleção. Devolve os ids das fotos, do mais parecido para o menos. */
export async function searchBySelfie(jpeg: Buffer): Promise<string[]> {
  try {
    const r = await rk().send(
      new SearchFacesByImageCommand({
        CollectionId: COLLECTION(),
        Image: { Bytes: jpeg },
        MaxFaces: 1000,
        FaceMatchThreshold: 90,
        QualityFilter: "AUTO",
      })
    );
    const ids: string[] = [];
    for (const m of r.FaceMatches ?? []) {
      const id = m.Face?.ExternalImageId;
      if (id && !ids.includes(id)) ids.push(id);
    }
    return ids;
  } catch (e: any) {
    // a coleção ainda não existe ou a selfie não tem rosto legível
    if (e?.name === "ResourceNotFoundException") return [];
    if (e?.name === "InvalidParameterException") throw new NoFaceError("Nenhum rosto encontrado na selfie");
    throw e;
  }
}
