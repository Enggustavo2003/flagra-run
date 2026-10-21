// Valores públicos (os mesmos que o site usa no navegador). Vêm do build: EXPO_PUBLIC_*.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://flagrarun.com.br').replace(/\/$/, '');

// Mandada ao site em cada envio; o site usa para avisar quando um APK antigo precisar de atualização
export const APP_VERSION = '1.0.0';

export const configOk = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

export const FTP_PORT = 2121;
export const FTP_USER = 'flagra';

export const previewUrl = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/previews/${path}`;

// Identidade Flagra Run
export const C = {
  bg: '#0F1311',
  card: '#161C19',
  card2: '#1B221E',
  line: 'rgba(243,244,241,0.08)',
  text: '#F3F4F1',
  dim: 'rgba(243,244,241,0.55)',
  yellow: '#FFD23F',
  blue: '#4F68FF',
  green: '#3DDC84',
  red: '#FF5A4F',
  ink: '#141A17',
};
