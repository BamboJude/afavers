declare const __APP_VERSION__: string;

export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
const SUPABASE_AUTH_STORAGE_KEY = 'afavers-supabase-auth-v3';
const LEGACY_AUTH_STORAGE_KEYS = ['afavers-supabase-auth-v2'];
const AUTH_SCHEMA_VERSION = '2026-04-auth-schema-v1';

export function migrateAuthStorageSchema(): void {
  try {
    const storedVersion = localStorage.getItem('afavers-auth-schema-version');
    if (storedVersion === AUTH_SCHEMA_VERSION) return;

    clearAuthStorage();
    localStorage.setItem('afavers-auth-schema-version', AUTH_SCHEMA_VERSION);
  } catch {
    // localStorage can be blocked in strict privacy modes.
  }
}

export function clearAuthStorage(): void {
  try {
    localStorage.removeItem('auth-storage');
    localStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY);
    LEGACY_AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    Object.keys(localStorage)
      .filter((key) => key.startsWith('sb-') && key.includes('-auth-token'))
      .forEach((key) => localStorage.removeItem(key));
    sessionStorage.clear();
  } catch {
    // Storage can be blocked in strict privacy modes.
  }
}

export function isStaleChunkError(error: unknown): boolean {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : String(error ?? '');
  return (
    name === 'ChunkLoadError' ||
    /loading chunk|failed to fetch dynamically imported module|importing a module script failed/i.test(message)
  );
}

export async function refreshAppCache(reload = true): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // Cache APIs are optional; continue with storage cleanup.
  }

  clearAuthStorage();
  try {
    localStorage.setItem('app_version', APP_VERSION);
    localStorage.setItem('afavers-auth-schema-version', AUTH_SCHEMA_VERSION);
    localStorage.setItem('afavers-cache-reset-at', new Date().toISOString());
  } catch {}

  if (reload) window.location.reload();
}
