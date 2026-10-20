import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Llave pública (publishable). La lógica sensible vive en Edge Functions de YUNQUE.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://uloquxlrghnvbrinfacw.supabase.co';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? 'sb_publishable_jdwXHvpr4jml-zhYcQhFNw_2ISCIyhc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: { schema: 'casealerta' },
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

/** Sesión anónima: la persona entra sin cuenta; el correo se liga después en O3/A3. */
export async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return anon.session!;
}
