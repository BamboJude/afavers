import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { fetchAdzunaJobs, fetchBundesagenturJobs, getSearchConfig, saveJobs } from '../_shared/jobs.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const cronSecret = Deno.env.get('CRON_SECRET');
    const hasCronSecret = Boolean(cronSecret && req.headers.get('x-cron-secret') === cronSecret);
    if (cronSecret && !hasCronSecret) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
        global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await supabase.auth.getUser();
      if (!data.user) return jsonResponse({ error: 'Unauthorized' }, 401);
    }

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
    });
  } catch (error) {
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : 'Fetch failed' }, 500);
  }
});
