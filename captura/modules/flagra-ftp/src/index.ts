import { requireOptionalNativeModule, type EventSubscription } from 'expo';

export type FtpFileEvent = { path: string; name: string; size: number };
export type FtpStatusEvent = { kind: 'connected' | 'disconnected' | 'auth_failed' | 'error'; message: string };

type Native = {
  start(port: number, user: string, pass: string): Promise<string>;
  stop(): void;
  isRunning(): boolean;
  clients(): number;
  addresses(): string[];
  addListener(event: 'onFile', cb: (e: FtpFileEvent) => void): EventSubscription;
  addListener(event: 'onStatus', cb: (e: FtpStatusEvent) => void): EventSubscription;
};

// Só existe no Android (APK). No Expo Go ou no iOS fica indisponível.
const native = requireOptionalNativeModule<Native>('FlagraFtp');

export const ftpAvailable = native != null;

export function startFtp(port: number, user: string, pass: string): Promise<string> {
  if (!native) return Promise.reject(new Error('Servidor FTP só funciona no app Android instalado.'));
  return native.start(port, user, pass);
}
export function stopFtp() { native?.stop(); }
export function ftpRunning() { return native?.isRunning() ?? false; }
export function ftpClients() { return native?.clients() ?? 0; }
export function ftpAddresses(): string[] { return native?.addresses() ?? []; }
export function onFtpFile(cb: (e: FtpFileEvent) => void) { return native?.addListener('onFile', cb); }
export function onFtpStatus(cb: (e: FtpStatusEvent) => void) { return native?.addListener('onStatus', cb); }
