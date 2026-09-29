import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppState} from 'react-native';
import {createClient} from '@supabase/supabase-js';

const SUPABASE_URL = 'https://riyeyquumuusuyqdqfia.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fErgr_qwWI2RALaC6Uzn5g_VaK4TdTc';

// Usa la cabecera HTTP del servidor para compensar relojes desfasados en emuladores.
export async function getServerTimeOffset() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/asistencias_tv?select=id&limit=1`, {
      headers: {apikey: SUPABASE_ANON_KEY},
    });
    const serverDate = response.headers.get('date');
    const timestamp = serverDate ? Date.parse(serverDate) : NaN;
    return Number.isFinite(timestamp) ? timestamp - Date.now() : 0;
  } catch (_) {
    return 0;
  }
}

let client = null;

try {
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
} catch (error) {
  console.warn('Supabase init failed:', error?.message || error);
}

export const supabase = client;
export const isSupabaseReady = () => !!supabase && !!supabase.auth && !!supabase.from;

if (supabase) {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
