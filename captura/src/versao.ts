import { APP_VERSION, SITE_URL } from './config';

export type Atualizacao = { precisa: boolean; link: string | null };

/** "1.2.10" > "1.2.9" */
export function menor(a: string, b: string) {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}

/** Pergunta ao site se este APK ainda é aceito. Sem internet: segue a vida. */
export async function checarAtualizacao(): Promise<Atualizacao> {
  try {
    const r = await fetch(`${SITE_URL}/api/captura/v1/info`);
    if (!r.ok) return { precisa: false, link: null };
    const d = (await r.json()) as { minVersion?: string; downloadUrl?: string | null };
    return { precisa: !!d.minVersion && menor(APP_VERSION, d.minVersion), link: d.downloadUrl ?? null };
  } catch {
    return { precisa: false, link: null };
  }
}
