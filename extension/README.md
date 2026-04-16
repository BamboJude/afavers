# afavers Job Capture — Browser Extension

A Chrome + Firefox Manifest V3 extension that extracts job listings from
common job boards (LinkedIn, Indeed, StepStone, Xing, Arbeitsagentur,
Glassdoor, Monster, jobs.de, karriere.de) and saves them directly to
Supabase.

## Architecture (since 2026-04-17)

The extension talks to Supabase directly using `@supabase/supabase-js`.
The Express API (`server-production-ebd2b.up.railway.app`) is no longer
called from this extension and will be retired in a follow-up PR.

- `popup.src.js` — source (ES modules + `@supabase/supabase-js`). Edit this.
- `popup.bundle.js` — the file actually loaded by `popup.html`. Produced
  by `npm run build`. Committed so users can load the unpacked extension
  without running `npm install`.
- `content.js` — plain DOM extractor, runs in the page. No network calls.
- `config.js` — runtime configuration (Supabase URL, anon key, dashboard
  URL). Loaded by `popup.html` before the bundle.
- `manifest.json` — MV3 manifest, Chrome + Firefox compatible.

## First-time setup

1. Clone the repo and `cd extension`.
2. Edit `config.js` and replace the three placeholder values with your
   own Supabase project URL, anon key, and dashboard URL.
3. Edit `manifest.json` and replace the `https://YOUR-PROJECT-REF.supabase.co/*`
   entry in `host_permissions` with the same Supabase host you set in
   step 2.
4. (optional) If you're going to modify `popup.src.js`, run
   `npm install && npm run build` to regenerate `popup.bundle.js`.

Never commit a real Supabase anon key or a service-role key to `config.js`.
The file ships with the extension package and can be read by anyone who
installs it.

## Loading the unpacked extension

### Chrome / Edge / Brave
1. Visit `chrome://extensions`.
2. Toggle "Developer mode" on (top-right).
3. Click "Load unpacked" and select the `extension/` folder.

### Firefox
1. Visit `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on…".
3. Select any file inside `extension/` (e.g. `manifest.json`).

## Manual test plan

> The extension cannot be exercised from a headless environment — you have
> to load it in a real browser. The steps below are the smoke test that
> should pass before merging.

### 1. Login
1. Open the popup (click the toolbar icon).
2. Sign in with a valid afavers account.
   - Leave "Keep me signed in on this device" *unchecked*. The session
     lives in `chrome.storage.session` and is cleared when the browser
     closes.
   - With "Keep me signed in" checked, the session is persisted in
     `chrome.storage.local` (survives browser restart).
3. Expected: redirect to the capture view. Your email appears in the
   header. No error in the login area.
4. Negative: try a wrong password → readable error ("Invalid login
   credentials" from Supabase).

### 2. Capture a job
Open one of these live job pages in the active tab, then click the
extension:

- LinkedIn   — any URL matching `https://www.linkedin.com/jobs/view/*`
- Indeed     — `https://*.indeed.com/viewjob?jk=*`
- StepStone  — `https://www.stepstone.de/stellenangebote--*`
- Xing       — `https://www.xing.com/jobs/*`
- Arbeitsagentur — `https://www.arbeitsagentur.de/jobsuche/jobdetail/*`

Expected:
- Fields (title, company, location, salary, description) pre-fill from
  the page via `content.js`.
- Clicking "Save to afavers" produces a success view within ~1 s.
- In Supabase Studio → `public.jobs`, a new row exists with
  `is_manual = TRUE`, `source = 'manual'`, and `owner_user_id` set to
  your app-user id.
- In Supabase Studio → `public.user_jobs`, a new row exists with
  `status = 'saved'` (or whichever status you chose) and `user_id` set
  to your app-user id.
- Re-clicking save on the same tab produces an updated row (upsert on
  `external_id` for `jobs`, and on `(user_id, job_id)` for `user_jobs`),
  not a duplicate.

### 3. Session expiry
1. In Supabase Studio → Auth → Users, invalidate your session (or wait
   for the JWT to expire — default 1 h).
2. Try to save another job.
3. Expected: routed back to the login view with "Your session expired —
   please sign in again."

### 4. Logout
1. Click the logout icon in the header.
2. Expected: returned to the login view. Re-opening the popup stays on
   the login view. `chrome.storage.session` and `chrome.storage.local`
   no longer contain `afavers.auth.token` or `afavers.appUser`.

### 5. Misconfiguration
1. Revert `config.js` to the placeholder values (or delete the file's
   assignments).
2. Reload the unpacked extension.
3. Expected: login view shows "Extension is not configured. Edit
   extension/config.js and reload the unpacked extension." and the
   Sign-In button refuses to proceed.

## Legacy cleanup for pre-2026-04-17 users

Older versions wrote the Supabase access token under
`chrome.storage.local` keys `accessToken` / `refreshToken` /
`userEmail` / `authUserId` / `appUserId`. The new `logout-btn` handler
wipes those keys in addition to the new `afavers.*` keys, so a single
click of "Sign out" on upgrade is enough. If you want to wipe state
without signing in first, open DevTools on the popup and run:

```js
chrome.storage.local.clear();
chrome.storage.session.clear();
```

## Why a build step?

Manifest V3 forbids remote code and the extension CSP is
`script-src 'self'`. That means the Supabase client has to ship inside
the extension. Since `@supabase/supabase-js` is published as ES modules
with several internal imports, we bundle it into a single
`popup.bundle.js` file via esbuild. The bundle is committed so nobody
has to install Node just to load the extension.

Run `npm run build:watch` while editing `popup.src.js` to rebuild on
every save.
