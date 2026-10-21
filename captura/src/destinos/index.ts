import { flagraRun } from './flagrarun';
import type { Destino, DestinoId } from './tipos';

export * from './tipos';

/** Destinos disponíveis. Um novo destino = um arquivo nesta pasta + uma linha aqui. */
const DESTINOS: Record<DestinoId, Destino> = {
  flagrarun: flagraRun,
};

export function destino(id: DestinoId): Destino {
  return DESTINOS[id] ?? flagraRun;
}
