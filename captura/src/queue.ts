import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuid } from 'expo';
import { Directory, File, UploadType } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { SITE_URL, SUPABASE_ANON_KEY, SUPABASE_URL } from './config';
import { accessToken } from './supabase';

/** "rapido" = maior lado 3000 px; "original" = arquivo cheio da câmera. O que sobe é o que o comprador recebe. */
export type UploadSize = 'rapido' | 'original';
export type ItemStatus = 'fila' | 'enviando' | 'enviada' | 'erro';

export type Item = {
  id: string;
  eventId: string;
  path: string; // arquivo local recebido pelo FTP
  name: string; // nome que veio da câmera
  bytes: number;
  size: UploadSize; // escolhido na hora em que a foto entrou na fila
  status: ItemStatus;
  tries: number;
  nextAt: number;
  error?: string;
  previewPath?: string;
  addedAt: number;
  doneAt?: number;
};

const KEY = 'flagra-capture:fila:v1';
const PARALLEL = 2;
const MAX_TRIES = 8;
const KEEP_DONE = 300;
export const RAPIDO_MAX = 3000;

let items: Item[] = [];
let loaded = false;
let running = false;
let active = 0;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let tickTimer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();
let snapshot: Item[] = [];

function emit() {
  snapshot = [...items];
  listeners.forEach((l) => l());
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => {});
  }, 400);
}

export const queue = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  getSnapshot: () => snapshot,

  async load() {
    if (loaded) return;
    loaded = true;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) items = JSON.parse(raw) as Item[];
    } catch {
      items = [];
    }
    // o app fechou no meio de um envio: volta para a fila
    items = items.map((i) => (i.status === 'enviando' ? { ...i, status: 'fila', nextAt: 0 } : i));
    emit();
  },

  /** Foto nova da câmera. Ignora repetida (mesmo nome e tamanho no mesmo evento). */
  add(eventId: string, path: string, name: string, bytes: number, size: UploadSize) {
    const dup = items.find((i) => i.eventId === eventId && i.name === name && i.bytes === bytes && i.status !== 'erro');
    if (dup) {
      if (dup.path !== path) safeDelete(path);
      return;
    }
    items.push({ id: uuid.v4(), eventId, path, name, bytes, size, status: 'fila', tries: 0, nextAt: 0, addedAt: Date.now() });
    emit();
    pump();
  },

  /** Fotos que chegaram com o app fechado ou em segundo plano. */
  reconcile(inboxDir: string, eventId: string, size: UploadSize) {
    try {
      const dir = new Directory(inboxDir.startsWith('file://') ? inboxDir : `file://${inboxDir}`);
      if (!dir.exists) return;
      const known = new Set(items.map((i) => fileUri(i.path)));
      for (const entry of dir.list()) {
        if (!(entry instanceof File)) continue;
        const uri = entry.uri;
        if (!/\.jpe?g$/i.test(uri) || known.has(uri)) continue;
        const physical = decodeURIComponent(uri.split('/').pop() ?? 'foto.jpg');
        const name = physical.replace(/^\d+_/, '');
        queue.add(eventId, uri, name, entry.size ?? 0, size);
      }
    } catch {
      // pasta ainda não existe
    }
  },

  retryErrors() {
    items = items.map((i) => (i.status === 'erro' ? { ...i, status: 'fila', tries: 0, nextAt: 0, error: undefined } : i));
    emit();
    pump();
  },

  clearDone() {
    items = items.filter((i) => i.status !== 'enviada');
    emit();
  },

  start() {
    running = true;
    if (!tickTimer) tickTimer = setInterval(pump, 3000);
    pump();
  },
  stop() {
    running = false;
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = null;
  },
};

function fileUri(p: string) {
  return p.startsWith('file://') ? p : `file://${p}`;
}

function safeDelete(p: string) {
  try {
    const f = new File(fileUri(p));
    if (f.exists) f.delete();
  } catch {
    // já foi apagado
  }
}

function update(id: string, patch: Partial<Item>) {
  items = items.map((i) => (i.id === id ? { ...i, ...patch } : i));
  // guarda só as últimas enviadas para a lista não crescer sem fim
  const done = items.filter((i) => i.status === 'enviada');
  if (done.length > KEEP_DONE) {
    const drop = new Set(done.slice(0, done.length - KEEP_DONE).map((i) => i.id));
    items = items.filter((i) => !drop.has(i.id));
  }
  emit();
}

function pump() {
  if (!running) return;
  while (active < PARALLEL) {
    const now = Date.now();
    const next = items.find((i) => i.status === 'fila' && i.nextAt <= now);
    if (!next) return;
    active++;
    update(next.id, { status: 'enviando' });
    send(next)
      .then((previewPath) => {
        update(next.id, { status: 'enviada', previewPath, doneAt: Date.now(), error: undefined });
        safeDelete(next.path);
      })
      .catch((e: unknown) => {
        const tries = next.tries + 1;
        const msg = e instanceof Error ? e.message : 'Falhou';
        const fatal = e instanceof FatalError || tries >= MAX_TRIES;
        update(next.id, {
          status: fatal ? 'erro' : 'fila',
          tries,
          error: msg,
          nextAt: Date.now() + Math.min(60_000, 2000 * 2 ** tries),
        });
      })
      .finally(() => {
        active--;
        pump();
      });
  }
}

class FatalError extends Error {}

// Uma foto de 24 MP aberta ocupa ~100 MB: redimensiona uma por vez para não estourar a memória
let resizeLock: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(fn: () => Promise<T>): Promise<T> {
  const run = resizeLock.then(fn, fn);
  resizeLock = run.catch(() => {});
  return run;
}

/** Reduz para 3000 px no maior lado. Foto já menor que isso sobe como está. */
async function prepare(item: Item): Promise<{ uri: string; temp: boolean }> {
  const src = fileUri(item.path);
  if (!new File(src).exists) throw new FatalError('Arquivo sumiu do aparelho');
  if (item.size === 'original') return { uri: src, temp: false };
  return oneAtATime(() => resize(src));
}

async function resize(src: string): Promise<{ uri: string; temp: boolean }> {
  const probe = await ImageManipulator.manipulate(src).renderAsync();
  const w = probe.width;
  const h = probe.height;
  probe.release();
  if (Math.max(w, h) <= RAPIDO_MAX) return { uri: src, temp: false };

  const ref = await ImageManipulator.manipulate(src)
    .resize(w >= h ? { width: RAPIDO_MAX } : { height: RAPIDO_MAX })
    .renderAsync();
  const out = await ref.saveAsync({ compress: 0.9, format: SaveFormat.JPEG });
  ref.release();
  return { uri: out.uri, temp: true };
}

async function send(item: Item): Promise<string | undefined> {
  const auth = await accessToken();
  if (!auth) throw new Error('Entre de novo no app');

  const { uri, temp } = await prepare(item);
  try {
    // 1) sobe o arquivo para a pasta privada do fotógrafo (mesma regra do site)
    const path = `${auth.userId}/${item.eventId}/${uuid.v4()}.jpg`;
    const up = await new File(uri).upload(`${SUPABASE_URL}/storage/v1/object/originals/${path}`, {
      httpMethod: 'POST',
      uploadType: UploadType.BINARY_CONTENT,
      mimeType: 'image/jpeg',
      headers: {
        Authorization: `Bearer ${auth.token}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'false',
        'cache-control': '3600',
      },
    });
    if (up.status === 401 || up.status === 403) throw new Error('Login expirou, tentando de novo');
    if (up.status < 200 || up.status >= 300) throw new Error(`Storage ${up.status}`);

    // 2) o site gera a prévia com marca d'água, indexa a selfie e põe à venda
    const res = await fetch(`${SITE_URL}/api/fotos/processar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ eventId: item.eventId, path, source: 'app', size: item.size }),
    });
    const body = (await res.json().catch(() => null)) as { error?: string; photo?: { preview_path?: string } } | null;
    if (res.status === 422) throw new FatalError(body?.error ?? 'Não é uma imagem válida');
    if (res.status === 404 && body?.error === 'Evento não encontrado') throw new FatalError('Evento não encontrado');
    if (!res.ok) throw new Error(body?.error ?? `Site ${res.status}`);
    return body?.photo?.preview_path;
  } finally {
    if (temp) safeDelete(uri);
  }
}
