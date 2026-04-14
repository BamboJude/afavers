import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { detectLanguage } from './language.ts';

export interface ExternalJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  postedDate?: string;
  deadline?: string;
  salary?: string;
}

const BA_URL = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/app/jobs';
const ADZUNA_URL = 'https://api.adzuna.com/v1/api/jobs/de/search';
const DEFAULT_KEYWORDS = ['consulting', 'beratung', 'nachhaltigkeit', 'umwelt', 'gis', 'energy'];
const DEFAULT_LOCATIONS = ['Düsseldorf', 'Köln', 'Essen', 'Bochum', 'Dortmund'];

function env(name: string): string {
  return Deno.env.get(name) ?? '';
}

export function adminClient() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(value = ''): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function getSearchConfig(): Promise<{ keywords: string[]; locations: string[] }> {
  const supabase = adminClient();
  const { data, error } = await supabase.from('user_settings').select('keywords,locations');
  if (error || !data?.length) return { keywords: DEFAULT_KEYWORDS, locations: DEFAULT_LOCATIONS };

  const keywords = new Set<string>();
  const locations = new Set<string>();
  for (const row of data) {
    String(row.keywords ?? '').split(',').map((item) => item.trim()).filter(Boolean).forEach((item) => keywords.add(item.toLowerCase()));
    String(row.locations ?? '').split(',').map((item) => item.trim()).filter(Boolean).forEach((item) => locations.add(item));
  }

  return {
    keywords: keywords.size ? [...keywords].slice(0, 24) : DEFAULT_KEYWORDS,
    locations: locations.size ? [...locations].slice(0, 16) : DEFAULT_LOCATIONS,
  };
}

export async function fetchBundesagenturJobs(keywords: string[], locations: string[]): Promise<ExternalJob[]> {
  const jobs: ExternalJob[] = [];
  const apiKey = env('BUNDESAGENTUR_API_KEY') || 'jobboerse-jobsuche';

  for (const keyword of keywords.slice(0, 20)) {
    for (const location of locations.slice(0, 12)) {
      const url = new URL(BA_URL);
      url.searchParams.set('was', keyword);
      url.searchParams.set('wo', location);
      url.searchParams.set('size', '35');
      url.searchParams.set('page', '1');
      url.searchParams.set('angebotsart', '1');
      url.searchParams.set('pav', 'false');
      url.searchParams.set('umkreis', '25');

      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Jobsuche/2.9.2 (de.arbeitsagentur.jobboerse; build:1077; iOS 15.1.0) Alamofire/5.4.4',
            'X-API-Key': apiKey,
          },
        });
        if (!response.ok) continue;
        const data = await response.json();
        for (const item of data?.stellenangebote ?? []) {
          const city = item.arbeitsort?.ort || location || 'Germany';
          const plz = item.arbeitsort?.plz || '';
          jobs.push({
            id: `bundesagentur_${item.refnr}`,
            title: item.titel || item.beruf || 'No title',
            company: item.arbeitgeber || 'Not specified',
            location: plz ? `${city} (${plz})` : city,
            description: `Position: ${item.beruf || 'Not specified'}`,
            url: `https://www.arbeitsagentur.de/jobsuche/jobdetail/${item.refnr}`,
            postedDate: item.aktuelleVeroeffentlichungsdatum || item.modifikationsTimestamp,
          });
        }
      } catch {
        // Keep the batch resilient; one city/keyword failing should not stop the run.
      }

      await sleep(250);
    }
  }

  return jobs;
}

export async function fetchAdzunaJobs(): Promise<ExternalJob[]> {
  const appId = env('ADZUNA_APP_ID');
  const appKey = env('ADZUNA_APP_KEY');
  if (!appId || !appKey) return [];

  const keywords = ['nachhaltigkeit', 'umwelt', 'energy', 'consulting'];
  const locations = ['Düsseldorf', 'Köln', 'Berlin'];
  const jobs: ExternalJob[] = [];

  for (const keyword of keywords) {
    for (const location of locations) {
      const url = new URL(`${ADZUNA_URL}/1`);
      url.searchParams.set('app_id', appId);
      url.searchParams.set('app_key', appKey);
      url.searchParams.set('results_per_page', '25');
      url.searchParams.set('what', keyword);
      url.searchParams.set('where', location);

      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const data = await response.json();
        for (const item of data?.results ?? []) {
          const salary = item.salary_min && item.salary_max && !item.salary_is_predicted
            ? `€${Math.round(item.salary_min)} - €${Math.round(item.salary_max)}`
            : undefined;
          jobs.push({
            id: `adzuna_${item.id}`,
            title: item.title,
            company: item.company?.display_name || 'Not specified',
            location: item.location?.display_name || location,
            description: cleanText(item.description).slice(0, 1000),
            url: item.redirect_url,
            postedDate: item.created,
            salary,
          });
        }
      } catch {
        // Continue with the next query.
      }

      await sleep(250);
    }
  }

  return jobs;
}

function dedupe(jobs: ExternalJob[]): ExternalJob[] {
  const byId = new Map<string, ExternalJob>();
  for (const job of jobs) {
    if (!job.id || byId.has(job.id)) continue;
    byId.set(job.id, job);
  }
  return [...byId.values()];
}

export async function saveJobs(jobs: ExternalJob[]): Promise<{ total: number; inserted: number; updated: number; failed: number }> {
  const supabase = adminClient();
  const unique = dedupe(jobs);
  const ids = unique.map((job) => job.id);
  const { data: existing } = ids.length
    ? await supabase.from('jobs').select('external_id').in('external_id', ids)
    : { data: [] as { external_id: string }[] };
  const existingIds = new Set((existing ?? []).map((row) => row.external_id));

  const rows = unique.map((job) => ({
    external_id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.description,
    url: job.url,
    source: job.id.split('_')[0],
    posted_date: job.postedDate ? new Date(job.postedDate).toISOString().slice(0, 10) : null,
    deadline: job.deadline ? new Date(job.deadline).toISOString().slice(0, 10) : null,
    salary: job.salary ?? null,
    language: detectLanguage(job.title, job.description),
    updated_at: new Date().toISOString(),
  }));

  if (!rows.length) {
    return { total: 0, inserted: 0, updated: 0, failed: 0 };
  }

  const { error } = await supabase.from('jobs').upsert(rows, { onConflict: 'external_id' });
  if (error) throw error;

  return {
    total: unique.length,
    inserted: unique.filter((job) => !existingIds.has(job.id)).length,
    updated: unique.filter((job) => existingIds.has(job.id)).length,
    failed: 0,
  };
}
