import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuid } from 'expo';
import { Directory, File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { previewUrl } from './config';
import { destino, ErroDefinitivo, type Alvo, type DestinoId } from './destinos';

/** "rapido" = maior lado 3000 px; "original" = arquivo cheio da câmera. O que sobe é o que o comprador recebe. */
export type UploadSize = 'rapido' | 'original';
export type ItemStatus = 'fila' | 'enviando' | 'enviada' | 'erro';

export type Item = {
  id: string;
  destino: DestinoId; // para onde vai (hoje sempre Flagra Run)
  alvoId: string; // dentro do destino (no Flagra Run: o evento)
  alvoNome: string;
  path: string; // arquivo local recebido pelo FTP
  name: string; // nome que veio da câmera
  bytes: number;
  size: UploadSize; // escolhido na hora em que a foto entrou na fila
  status: ItemStatus;
  tries: number;
  nextAt: number;
  error?: string;
  previewUrl?: string;
  addedAt: number;
  doneAt?: number;
};

const KEY = 'flagra-capture:fila:v2';
const KEY_V1 = 'flagra-capture:fila:v1';
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

/** Fila gravada pela versão anterior (só Flagra Run, campo eventId). */
type ItemV1 = Omit<Item, 'destino' | 'alvoId' | 'alvoNome' | 'previewUrl'> & { eventId: string; previewPath?: string };
function fromV1(i: ItemV1): Item {
  const { eventId, previewPath, ...rest } = i;
  return { ...rest, destino: 'flagrarun', alvoId: eventId, alvoNome: '', previewUrl: previewPath ? previewUrl(previewPath) : undefined };
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
      else {
        const old = await AsyncStorage.getItem(KEY_V1);
        if (old) items = (JSON.parse(old) as ItemV1[]).map(fromV1);
      }
    } catch {
      items = [];
    }
    // o app fechou no meio de um envio: volta para a fila
    items = items.map((i) => (i.status === 'enviando' ? { ...i, status: 'fila', nextAt: 0 } : i));
    emit();
  },

  /** Foto nova da câmera. Ignora repetida (mesmo nome e tamanho no mesmo alvo). */
  add(alvo: Alvo, path: string, name: string, bytes: number, size: UploadSize) {
    const dup = items.find(
      (i) => i.destino === alvo.destino && i.alvoId === alvo.id && i.name === name && i.bytes === bytes && i.status !== 'erro'
    );
    if (dup) {
      if (dup.path !== path) safeDelete(path);
      return;
    }
    items.push({
      id: uuid.v4(),
      destino: alvo.destino,
      alvoId: alvo.id,
      alvoNome: alvo.nome,
      path,
      name,
      bytes,
      size,
      status: 'fila',
      tries: 0,
      nextAt: 0,
      addedAt: Date.now(),
    });
    emit();
    pump();
  },

  /** Fotos que chegaram com o app fechado ou em segundo plano. */
  reconcile(inboxDir: string, alvo: Alvo, size: UploadSize) {
    try {
      const dir = new Directory(fileUri(inboxDir));
      if (!dir.exists) return;
      const known = new Set(items.map((i) => fileUri(i.path)));
      for (const entry of dir.list()) {
        if (!(entry instanceof File)) continue;
        const uri = entry.uri;
        if (!/\.jpe?g$/i.test(uri) || known.has(uri)) continue;
        const physical = decodeURIComponent(uri.split('/').pop() ?? 'foto.jpg');
        const name = physical.replace(/^\d+_/, '');
        queue.add(alvo, uri, name, entry.size ?? 0, size);
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
      .then((url) => {
        update(next.id, { status: 'enviada', previewUrl: url, doneAt: Date.now(), error: undefined });
        safeDelete(next.path);
      })
      .catch((e: unknown) => {
        const tries = next.tries + 1;
        const msg = e instanceof Error ? e.message : 'Falhou';
        const fatal = e instanceof ErroDefinitivo || tries >= MAX_TRIES;
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
  if (!new File(src).exists) throw new ErroDefinitivo('Arquivo sumiu do aparelho');
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

/** Prepara o arquivo e entrega ao destino da foto. */
async function send(item: Item): Promise<string | undefined> {
  const { uri, temp } = await prepare(item);
  try {
    const r = await destino(item.destino).enviar(
      { uri, nome: item.name, mime: 'image/jpeg', tamanho: item.size },
      { destino: item.destino, id: item.alvoId, nome: item.alvoNome }
    );
    return r.previewUrl;
  } finally {
    if (temp) safeDelete(uri);
  }
}
