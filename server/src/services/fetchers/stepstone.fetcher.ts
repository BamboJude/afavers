import Parser from 'rss-parser';
import { ExternalJob } from '../../types/index.js';
import { pool } from '../../config/database.js';

const parser = new Parser({ timeout: 10000 });

const BASE_URL = 'https://www.stepstone.de/rss-stellenmarkt';

const DEFAULT_KEYWORDS  = ['consulting', 'nachhaltigkeit', 'umwelt', 'gis', 'energy'];
const DEFAULT_LOCATIONS = ['Düsseldorf', 'Köln', 'Essen', 'Bochum', 'Dortmund'];

async function getUserSearchConfig(): Promise<{ keywords: string[]; locations: string[] }> {
  try {
    const result = await pool.query('SELECT keywords, locations FROM user_settings');
    if (result.rows.length === 0) return { keywords: DEFAULT_KEYWORDS, locations: DEFAULT_LOCATIONS };

    const keywords  = new Set<string>();
    const locations = new Set<string>();
    for (const row of result.rows) {
      row.keywords.split(',').map((k: string) => k.trim()).filter(Boolean).forEach((k: string) => keywords.add(k));
      row.locations.split(',').map((l: string) => l.trim()).filter(Boolean).forEach((l: string) => locations.add(l));
    }
    return {
      keywords:  keywords.size  > 0 ? [...keywords]  : DEFAULT_KEYWORDS,
      locations: locations.size > 0 ? [...locations] : DEFAULT_LOCATIONS,
    };
  } catch {
    return { keywords: DEFAULT_KEYWORDS, locations: DEFAULT_LOCATIONS };
  }
}

/**
 * StepStone RSS title is usually "Job Title - Company Name"
 * Split on last " - " to get company
 */
function parseTitle(rawTitle: string): { title: string; company: string } {
  const parts = rawTitle.split(' - ');
  if (parts.length >= 2) {
    const company = parts.pop()!.trim();
    const title = parts.join(' - ').trim();
    return { title, company };
  }
  return { title: rawTitle.trim(), company: 'Not specified' };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchForKeywordAndLocation(keyword: string, location: string): Promise<ExternalJob[]> {
  const jobs: ExternalJob[] = [];
  try {
    const url = `${BASE_URL}?what=${encodeURIComponent(keyword)}&where=${encodeURIComponent(location)}`;
    const feed = await parser.parseURL(url);

    for (const item of feed.items ?? []) {
      if (!item.title || !item.link) continue;

      const { title, company } = parseTitle(item.title);
      const description = item.contentSnippet || stripHtml(item.content || '') || '';

      // Use link URL as unique ID (hash the link)
      const externalId = `stepstone_${Buffer.from(item.link).toString('base64url').slice(0, 40)}`;

      jobs.push({
        id: externalId,
        title,
        company,
        location,
        description: description.slice(0, 2000),
        url: item.link,
        postedDate: item.pubDate ? new Date(item.pubDate).toISOString() : undefined,
      });
    }
  } catch (error) {
    // StepStone may return empty/error for some combos — just skip
    if ((error as any)?.message?.includes('Non-whitespace')) return jobs; // XML parse error
    console.error(`StepStone error (${keyword}, ${location}):`, (error as any)?.message);
  }
  return jobs;
}

export async function fetchStepstoneJobs(): Promise<ExternalJob[]> {
  const allJobs: ExternalJob[] = [];
  const { keywords, locations } = await getUserSearchConfig();
  console.log(`🪜 StepStone: ${keywords.length} keywords × ${locations.length} locations`);

  for (const keyword of keywords) {
    for (const location of locations) {
      const jobs = await fetchForKeywordAndLocation(keyword, location);
      allJobs.push(...jobs);
      await new Promise(r => setTimeout(r, 800)); // polite delay
    }
  }

  console.log(`✅ StepStone: ${allJobs.length} jobs fetched`);
  return allJobs;
}
