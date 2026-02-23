import axios from 'axios';
import { ExternalJob } from '../../types/index.js';
import { env } from '../../config/env.js';

// Adzuna API configuration
const BASE_URL = 'https://api.adzuna.com/v1/api/jobs/de/search';

// Search configuration
const KEYWORDS = ['GIS', 'Umwelt', 'Klimaschutz', 'Energie', 'Sustainability'];
const LOCATIONS = ['Düsseldorf', 'Köln', 'Essen', 'Bochum', 'Dortmund'];

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

  const allJobs: ExternalJob[] = [];

  console.log('🔍 Fetching jobs from Adzuna...');

  try {
    // Fetch jobs for each keyword-location combination
    for (const keyword of KEYWORDS) {
      for (const location of LOCATIONS) {
        try {
          const jobs = await fetchJobsForKeywordAndLocation(keyword, location);
          allJobs.push(...jobs);

          // Rate limiting: wait 1 second between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error fetching ${keyword} in ${location}:`, error);
          // Continue with next combination
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
 * Fetch jobs for a specific keyword and location
 */
async function fetchJobsForKeywordAndLocation(
  keyword: string,
  location: string
): Promise<ExternalJob[]> {
  const jobs: ExternalJob[] = [];

  try {
    const response = await axios.get<AdzunaResponse>(`${BASE_URL}/1`, {
      params: {
        app_id: env.ADZUNA_APP_ID,
        app_key: env.ADZUNA_APP_KEY,
        results_per_page: 50,
        what: keyword,
        where: location
      },
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
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        console.warn('⚠️  Adzuna rate limit reached');
      } else {
        console.error(`Adzuna API error (${keyword}, ${location}):`, error.message);
      }
    } else {
      console.error('Unexpected error:', error);
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
