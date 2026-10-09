import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[supabase] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env.local y rellénalo. Mientras tanto solo funciona el modo demo.'
  );
}

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;

export function requireSupabase() {
  if (!supabase) throw new Error('Supabase no está configurado (revisa .env.local).');
  return supabase;
}
