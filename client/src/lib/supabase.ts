import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
  );
}

// Prefer sessionStorage so Supabase access/refresh tokens are wiped when
// the tab closes. Known UX regression: users will be signed out on tab
// close. Fall back to an in-memory stub during SSR / non-browser builds.
const authStorage: Storage | undefined =
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
    ? window.sessionStorage
    : undefined;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storageKey: 'afavers-supabase-auth-v3',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: authStorage,
    },
  }
);
