/**
 * Destino = para onde a foto vai depois de chegar da câmera.
 * Hoje só existe o Flagra Run. Google Drive, pasta local, FTP/SFTP de saída
 * ou outra plataforma entram como um arquivo novo nesta pasta, sem mexer
 * no FTP, na fila nem nas telas.
 */
export type DestinoId = 'flagrarun';

/** Onde, dentro do destino, a foto entra (no Flagra Run: o evento). */
export type Alvo = {
  destino: DestinoId;
  id: string;
  nome: string;
};

/** Arquivo pronto para subir (já reduzido, se for "Rápido"). */
export type ArquivoPronto = {
  uri: string; // file://...
  nome: string; // nome que veio da câmera
  mime: 'image/jpeg';
  tamanho: 'rapido' | 'original';
};

export type ResultadoEnvio = {
  /** Miniatura para a lista do app, se o destino tiver. */
  previewUrl?: string;
};

export interface Destino {
  id: DestinoId;
  nome: string;
  /** Sobe uma foto. Erro comum = tenta de novo depois; ErroDefinitivo = para de tentar. */
  enviar(arquivo: ArquivoPronto, alvo: Alvo): Promise<ResultadoEnvio>;
}

/** Erro que não adianta repetir (arquivo inválido, evento apagado, sem permissão). */
export class ErroDefinitivo extends Error {}
