import axios from 'axios';
import { ExternalJob } from '../../types/index.js';
import { env } from '../../config/env.js';

// Adzuna API configuration
const BASE_URL = 'https://api.adzuna.com/v1/api/jobs/de/search';

// Search configuration — kept small to stay within Adzuna free tier (250 req/week)
// 4 keywords × 3 locations × 1 page = 12 requests per daily run
const KEYWORDS = ['nachhaltigkeit', 'umwelt', 'energy', 'consulting'];
const LOCATIONS = ['Düsseldorf', 'Köln', 'Berlin'];
const PAGES_PER_SEARCH = 1;

// Only fetch from Adzuna once per 24 hours
let lastAdzunaFetch: Date | null = null;

interface AdzunaJob {
  id: string;
  title: string;
  company: {
    display_name: string;
  };
  location: {
    display_name: string;
    area?: string[];
  };
  description: string;
  redirect_url: string;
  created: string;
  contract_time?: string;
  salary_min?: number;
  salary_max?: number;
  salary_is_predicted?: number;
}

interface AdzunaResponse {
  results: AdzunaJob[];
  count: number;
}

/**
 * Fetch jobs from Adzuna API
 */
export async function fetchAdzunaJobs(): Promise<ExternalJob[]> {
  if (!env.ADZUNA_APP_ID || !env.ADZUNA_APP_KEY) {
    console.warn('⚠️  Adzuna API credentials not configured, skipping...');
    return [];
  }

  // Rate-guard: only run once per 24 hours
  if (lastAdzunaFetch) {
    const hoursSince = (Date.now() - lastAdzunaFetch.getTime()) / 3_600_000;
    if (hoursSince < 24) {
      console.log(`⏭️  Adzuna skipped (last run ${hoursSince.toFixed(1)}h ago, limit: 24h)`);
      return [];
    }
  }

  const allJobs: ExternalJob[] = [];
  lastAdzunaFetch = new Date();

  console.log('🔍 Fetching jobs from Adzuna (daily run)...');

  try {
    // Fetch jobs for each keyword-location combination
    for (const keyword of KEYWORDS) {
      for (const location of LOCATIONS) {
        try {
          const jobs = await fetchJobsForKeywordAndLocation(keyword, location);
          allJobs.push(...jobs);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error fetching ${keyword} in ${location}:`, error);
        }
      }
    }

    console.log(`✅ Adzuna: Fetched ${allJobs.length} jobs`);
    return allJobs;
  } catch (error) {
    console.error('❌ Adzuna fetcher failed:', error);
    return [];
  }
}

/**
 * Fetch jobs for a specific keyword and location (with pagination)
 * @param whatAnd - optional word that must appear in the job posting (e.g. 'english')
 */
async function fetchJobsForKeywordAndLocation(
  keyword: string,
  location: string,
  whatAnd?: string
): Promise<ExternalJob[]> {
  const jobs: ExternalJob[] = [];

  // Fetch multiple pages
  for (let page = 1; page <= PAGES_PER_SEARCH; page++) {
    try {
      const params: Record<string, string | number> = {
        app_id: env.ADZUNA_APP_ID!,
        app_key: env.ADZUNA_APP_KEY!,
        results_per_page: 25,
        what: keyword,
        where: location,
      };
      if (whatAnd) params['what_and'] = whatAnd;

      const response = await axios.get<AdzunaResponse>(`${BASE_URL}/${page}`, {
        params,
        timeout: 10000
      });

      if (response.data?.results) {
        for (const job of response.data.results) {
          try {
            const externalJob = mapToExternalJob(job);
            jobs.push(externalJob);
          } catch (error) {
            console.error('Error mapping Adzuna job:', error);
          }
        }
      }

      // If we got fewer results than requested, no more pages available
      if (!response.data?.results || response.data.results.length < 50) {
        break;
      }

      // Small delay between pages
      if (page < PAGES_PER_SEARCH) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          console.warn('⚠️  Adzuna rate limit reached');
          break; // Stop pagination if rate limited
        } else {
          console.error(`Adzuna API error (${keyword}, ${location}, page ${page}):`, error.message);
        }
      } else {
        console.error('Unexpected error:', error);
      }
      break; // Stop pagination on error
    }
  }

  return jobs;
}

/**
 * Map Adzuna job to ExternalJob format
 */
function mapToExternalJob(job: AdzunaJob): ExternalJob {
  // Format salary if available
  let salary: string | undefined;
  if (job.salary_min && job.salary_max && !job.salary_is_predicted) {
    salary = `€${Math.round(job.salary_min)} - €${Math.round(job.salary_max)}`;
  }

  // Clean up description (remove HTML tags if present)
  const description = job.description
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp;
    .replace(/&amp;/g, '&')  // Replace &amp;
    .trim()
    .substring(0, 1000); // Limit length

  return {
    id: `adzuna_${job.id}`,
    title: job.title,
    company: job.company.display_name,
    location: job.location.display_name,
    description,
    url: job.redirect_url,
    postedDate: job.created,
    deadline: undefined,
    salary
  };
}
