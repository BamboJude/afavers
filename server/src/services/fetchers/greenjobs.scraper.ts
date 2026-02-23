import axios from 'axios';
import * as cheerio from 'cheerio';
import { ExternalJob } from '../../types/index.js';
import crypto from 'crypto';

// greenjobs.de search URL
const BASE_URL = 'https://www.greenjobs.de/angebote.html';

// Search keywords for sustainability jobs
const SEARCH_TERMS = 'umwelt OR klimaschutz OR GIS OR nachhaltigkeit OR energie';

/**
 * Scrape jobs from greenjobs.de
 */
export async function scrapeGreenjobs(): Promise<ExternalJob[]> {
  const jobs: ExternalJob[] = [];

  console.log('🌱 Scraping jobs from greenjobs.de...');

  try {
    // Fetch the search results page
    const response = await axios.get(BASE_URL, {
      params: {
        // Note: Actual params may vary - adjust based on site structure
        q: SEARCH_TERMS,
        region: 'Nordrhein-Westfalen'
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'de,en;q=0.9'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);

    // Parse job listings
    // Note: Selectors may need adjustment based on actual site structure
    $('.job-listing, .job-item, .joboffer, article.job').each((_, element) => {
      try {
        const $job = $(element);

        // Extract job information
        const title = $job.find('.job-title, .title, h2, h3').first().text().trim();
        const company = $job.find('.company, .employer, .organization').first().text().trim();
        const location = $job.find('.location, .place, .city').first().text().trim();
        const url = $job.find('a').first().attr('href');
        const description = $job.find('.description, .summary, p').first().text().trim();

        // Skip if missing critical data
        if (!title || !url) {
          return;
        }

        // Make URL absolute if relative
        const absoluteUrl = url.startsWith('http')
          ? url
          : `https://www.greenjobs.de${url}`;

        // Generate unique ID from URL
        const urlHash = crypto
          .createHash('md5')
          .update(absoluteUrl)
          .digest('hex')
          .substring(0, 16);

        const job: ExternalJob = {
          id: `greenjobs_${urlHash}`,
          title,
          company: company || 'Not specified',
          location: location || 'Germany',
          description: description || title,
          url: absoluteUrl,
          postedDate: undefined, // Usually not available in listing
          deadline: undefined,
          salary: undefined
        };

        jobs.push(job);
      } catch (error) {
        console.error('Error parsing greenjobs job:', error);
      }
    });

    console.log(`✅ greenjobs.de: Scraped ${jobs.length} jobs`);
    return jobs;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ greenjobs.de scraping failed:', error.message);
      if (error.response?.status === 403 || error.response?.status === 429) {
        console.warn('⚠️  greenjobs.de may be blocking scraping attempts');
      }
    } else {
      console.error('❌ Unexpected error scraping greenjobs.de:', error);
    }
    return [];
  }
}

/**
 * Fallback: Try alternative selectors if first attempt finds no jobs
 */
function tryAlternativeSelectors($: cheerio.CheerioAPI): ExternalJob[] {
  const jobs: ExternalJob[] = [];

  // Try different common job listing selectors
  const selectors = [
    '.stellenangebot',
    '[class*="job"]',
    '[class*="offer"]',
    '[itemtype*="JobPosting"]'
  ];

  for (const selector of selectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      console.log(`Found ${elements.length} jobs with selector: ${selector}`);
      // Process with this selector
      break;
    }
  }

  return jobs;
}
