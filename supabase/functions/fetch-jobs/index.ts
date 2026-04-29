import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { fetchAdzunaJobs, fetchBundesagenturJobs, getSearchConfig, saveJobs } from '../_shared/jobs.ts';

function env(name: string): string {
  return Deno.env.get(name) ?? '';
}

async function isAuthenticatedRequest(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return false;

  const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error) return false;
  return Boolean(data.user);
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  // Cron-only endpoint. Fail closed:
  //   * If CRON_SECRET is not configured, reject every request (never
  //     fall through to user-bearer auth).
  //   * If the x-cron-secret header does not match, reject.
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret) {
    return jsonResponse({ error: 'CRON_SECRET is not configured' }, 401, req);
  }

  const isCronRequest = req.headers.get('x-cron-secret') === cronSecret;
  const isSignedInUser = isCronRequest ? false : await isAuthenticatedRequest(req);

  if (!isCronRequest && !isSignedInUser) {
    return jsonResponse({ error: 'Unauthorized' }, 401, req);
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
