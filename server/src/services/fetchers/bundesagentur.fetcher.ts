import axios from 'axios';
import { ExternalJob } from '../../types/index.js';
import { env } from '../../config/env.js';

// API endpoint for Bundesagentur für Arbeit
const BASE_URL = 'https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/app/jobs';

// Search configuration
const KEYWORDS = ['consulting', 'beratung', 'nachhaltigkeit', 'umwelt', 'gis', 'energy', 'renewable energy'];
const LOCATIONS = ['Düsseldorf', 'Köln', 'Essen', 'Bochum', 'Dortmund'];
const PAGES_PER_SEARCH = 2; // Fetch 2 pages per keyword/location combination

interface BundesagenturJob {
  refnr: string;
  beruf: string;
  arbeitgeber?: string;
  arbeitsort?: {
    ort?: string;
    plz?: string;
  };
  titel: string;
  aktuelleVeroeffentlichungsdatum?: string;
  eintrittsdatum?: string;
  modifikationsTimestamp?: string;
}

interface BundesagenturResponse {
  stellenangebote: BundesagenturJob[];
  maxErgebnisse: number;
  page: number;
}

/**
 * Fetch jobs from Bundesagentur für Arbeit API
 */
export async function fetchBundesagenturJobs(): Promise<ExternalJob[]> {
  const allJobs: ExternalJob[] = [];

  console.log('🇩🇪 Fetching jobs from Bundesagentur für Arbeit...');

  try {
    // Iterate through each keyword and location combination
    for (const keyword of KEYWORDS) {
      for (const location of LOCATIONS) {
        try {
          const jobs = await fetchJobsForKeywordAndLocation(keyword, location);
          allJobs.push(...jobs);

          // Rate limiting: wait 1 second between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error fetching ${keyword} in ${location}:`, error);
          // Continue with next combination even if one fails
        }
      }
    }

    console.log(`✅ Bundesagentur: Fetched ${allJobs.length} jobs`);
    return allJobs;
  } catch (error) {
    console.error('❌ Bundesagentur fetcher failed:', error);
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
    const response = await axios.get<BundesagenturResponse>(BASE_URL, {
      params: {
        was: keyword,
        wo: location,
        size: 50, // Results per page
        page: 1, // Page numbering starts at 1
        angebotsart: 1, // 1 = regular work
        pav: false, // Exclude private employment agencies
        umkreis: 25 // Search radius in km
      },
      headers: {
        'User-Agent': 'Jobsuche/2.9.2 (de.arbeitsagentur.jobboerse; build:1077; iOS 15.1.0) Alamofire/5.4.4',
        'X-API-Key': 'jobboerse-jobsuche',
        'Host': 'rest.arbeitsagentur.de',
        'Connection': 'keep-alive'
      },
      timeout: 10000
    });

    if (response.data?.stellenangebote) {
      for (const job of response.data.stellenangebote) {
        try {
          const externalJob = mapToExternalJob(job);
          jobs.push(externalJob);
        } catch (error) {
          console.error('Error mapping Bundesagentur job:', error);
        }
      }
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Bundesagentur API error (${keyword}, ${location}):`, error.message);
    } else {
      console.error('Unexpected error:', error);
    }
  }

  return jobs;
}

/**
 * Map Bundesagentur job to ExternalJob format
 */
function mapToExternalJob(job: BundesagenturJob): ExternalJob {
  const location = job.arbeitsort?.ort || 'Germany';
  const plz = job.arbeitsort?.plz || '';

  return {
    id: `bundesagentur_${job.refnr}`,
    title: job.titel || job.beruf || 'No title',
    company: job.arbeitgeber || 'Not specified',
    location: plz ? `${location} (${plz})` : location,
    description: `Position: ${job.beruf || 'Not specified'}`,
    url: `https://www.arbeitsagentur.de/jobsuche/jobdetail/${job.refnr}`,
    postedDate: job.aktuelleVeroeffentlichungsdatum || job.modifikationsTimestamp,
    deadline: undefined,
    salary: undefined
  };
}
