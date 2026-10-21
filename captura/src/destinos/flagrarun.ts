import { uuid } from 'expo';
import { File, UploadType } from 'expo-file-system';
import { APP_VERSION, SITE_URL, SUPABASE_ANON_KEY, SUPABASE_URL, previewUrl } from '../config';
import { accessToken } from '../supabase';
import { ErroDefinitivo, type Alvo, type ArquivoPronto, type Destino } from './tipos';

/**
 * Flagra Run: sobe para a pasta privada do fotógrafo no Storage (mesma regra do site)
 * e chama a API do app no site, que gera a prévia com marca d'água, indexa a selfie e põe à venda.
 */
export const flagraRun: Destino = {
  id: 'flagrarun',
  nome: 'Flagra Run',

  async enviar(arquivo: ArquivoPronto, alvo: Alvo) {
    const auth = await accessToken();
    if (!auth) throw new Error('Entre de novo no app');

    const path = `${auth.userId}/${alvo.id}/${uuid.v4()}.jpg`;
    const up = await new File(arquivo.uri).upload(`${SUPABASE_URL}/storage/v1/object/originals/${path}`, {
      httpMethod: 'POST',
      uploadType: UploadType.BINARY_CONTENT,
      mimeType: arquivo.mime,
      headers: {
        Authorization: `Bearer ${auth.token}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': arquivo.mime,
        'x-upsert': 'false',
        'cache-control': '3600',
      },
    });
    if (up.status === 401 || up.status === 403) throw new Error('Login expirou, tentando de novo');
    if (up.status < 200 || up.status >= 300) throw new Error(`Storage ${up.status}`);

    // rota versionada: o site pode mudar por dentro sem quebrar APK antigo
    const res = await fetch(`${SITE_URL}/api/captura/v1/fotos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
        'X-Flagra-Capture': APP_VERSION,
      },
      body: JSON.stringify({ eventId: alvo.id, path, source: 'app', size: arquivo.tamanho, name: arquivo.nome }),
    });
    const body = (await res.json().catch(() => null)) as { error?: string; photo?: { preview_path?: string } } | null;
    if (res.status === 422) throw new ErroDefinitivo(body?.error ?? 'Não é uma imagem válida');
    if (res.status === 404 && body?.error === 'Evento não encontrado') throw new ErroDefinitivo('Evento não encontrado');
    if (!res.ok) throw new Error(body?.error ?? `Site ${res.status}`);
    const pp = body?.photo?.preview_path;
    return { previewUrl: pp ? previewUrl(pp) : undefined };
  },
};
