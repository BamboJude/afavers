import { supabase } from '../lib/supabase';

export interface PublicJob {
  id: number;
  title: string;
  company: string;
  location: string;
  url: string;
  salary: string | null;
  source: string;
  posted_date: string | null;
  color?: string;
}

export async function getPublicJobs(limit = 10): Promise<PublicJob[]> {
  let { data, error } = await supabase
    .from('public_jobs')
    .select('id,title,company,location,url,salary,source,posted_date')
    .limit(limit);

  if (error && /public_jobs/i.test(error.message)) {
    const fallback = await supabase
      .from('jobs')
      .select('id,title,company,location,url,salary,source,posted_date')
      .not('url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw new Error(error.message);
  return data ?? [];
}
