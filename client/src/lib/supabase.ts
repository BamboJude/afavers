import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

// Prefer sessionStorage so Supabase access/refresh tokens are wiped when
// the tab closes. Known UX regression: users will be signed out on tab
// close. Fall back to an in-memory stub during SSR / non-browser builds.
const authStorage: Storage | undefined =
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
    ? window.sessionStorage
    : undefined;

export const supabase = createClient(
  supabaseUrl || 'https://mcaletfngisgofppfugr.supabase.co',
  supabaseAnonKey || 'missing-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: authStorage,
    },
  }
);
