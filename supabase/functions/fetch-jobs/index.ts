import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { fetchAdzunaJobs, fetchBundesagenturJobs, getSearchConfig, saveJobs } from '../_shared/jobs.ts';

function env(name: string): string {
  return Deno.env.get(name) ?? '';
}

async function isAuthorized(req: Request): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const providedCronSecret = req.headers.get('x-cron-secret');
  if (providedCronSecret) {
    const cronSecret = env('CRON_SECRET');
    if (!cronSecret) {
      return { ok: false, status: 401, error: 'CRON_SECRET is not configured' };
    }
    return providedCronSecret === cronSecret
      ? { ok: true }
      : { ok: false, status: 401, error: 'Unauthorized' };
  }

  const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const supabaseUrl = env('SUPABASE_URL');
  const supabaseAnonKey = env('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, status: 500, error: 'Supabase auth is not configured' };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  return { ok: true };
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  const auth = await isAuthorized(req);
  if (!auth.ok) {
    return jsonResponse({ error: auth.error }, auth.status, req);
  }

  try {
    const { keywords, locations } = await getSearchConfig();
    const [bundesagentur, adzuna] = await Promise.all([
      fetchBundesagenturJobs(keywords, locations),
      fetchAdzunaJobs(),
    ]);
    const result = await saveJobs([...bundesagentur, ...adzuna]);

    return jsonResponse({
      success: true,
      ...result,
      sources: {
        bundesagentur: bundesagentur.length,
        adzuna: adzuna.length,
      },
    }, 200, req);
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : 'Fetch failed' }, 500, req);
  }
});
