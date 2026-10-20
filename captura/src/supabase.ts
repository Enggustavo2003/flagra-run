import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

export const supabase = createClient(SUPABASE_URL || 'https://exemplo.supabase.co', SUPABASE_ANON_KEY || 'sem-chave', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Renova o login só com o app aberto
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

/** Token válido para mandar ao Storage e ao site. Renova se estiver para vencer. */
export async function accessToken(): Promise<{ token: string; userId: string } | null> {
  const { data } = await supabase.auth.getSession();
  let s = data.session;
  if (s && s.expires_at && s.expires_at * 1000 - Date.now() < 60_000) {
    const r = await supabase.auth.refreshSession();
    s = r.data.session;
  }
  return s ? { token: s.access_token, userId: s.user.id } : null;
}
