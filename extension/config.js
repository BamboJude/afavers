// afavers Job Capture — runtime configuration
// ────────────────────────────────────────────────────────────────────────────
// IMPORTANT: edit these values before loading the extension.
//
// 1) Replace `SUPABASE_URL` with your Supabase project URL, e.g.
//      https://abcdefghijklmno.supabase.co
// 2) Replace `SUPABASE_ANON_KEY` with the project's *anon* (public) key.
//    DO NOT paste a service-role key here — this file ships with the
//    extension and can be read by anyone who installs it.
// 3) Optionally tweak `DASHBOARD_URL` if you self-host the web app.
//
// After editing you must also update `manifest.json -> host_permissions` so
// the extension is allowed to talk to your Supabase host (the placeholder
// entry there uses the same `YOUR-PROJECT-REF` token — replace both).
//
// This file is read by `popup.html` BEFORE the bundle, so values end up on
// the global `self.__AFAVERS_CONFIG__` object.
// ────────────────────────────────────────────────────────────────────────────

self.__AFAVERS_CONFIG__ = {
  SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-SUPABASE-ANON-KEY',
  DASHBOARD_URL: 'https://afavers.online/jobs',
};
