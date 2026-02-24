import Parser from 'rss-parser';
import { ExternalJob } from '../../types/index.js';
import { pool } from '../../config/database.js';

const parser = new Parser({
  timeout: 10000,
  headers: {
    // Indeed requires a real User-Agent or it returns empty feeds
    'User-Agent': 'Mozilla/5.0 (compatible; RSS reader)',
    'Accept': 'application/rss+xml, application/xml, text/xml',
  },
});

const BASE_URL = 'https://de.indeed.com/rss';

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
 * Indeed RSS title: "Job Title - Company Name - City"
 * or "Job Title - Company Name"
 */
function parseTitle(rawTitle: string, fallbackLocation: string): { title: string; company: string; location: string } {
  const parts = rawTitle.split(' - ').map(p => p.trim());
  if (parts.length >= 3) {
    return { title: parts[0], company: parts[1], location: parts.slice(2).join(', ') };
  }
  if (parts.length === 2) {
    return { title: parts[0], company: parts[1], location: fallbackLocation };
  }
  return { title: rawTitle.trim(), company: 'Not specified', location: fallbackLocation };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchForKeywordAndLocation(keyword: string, location: string): Promise<ExternalJob[]> {
  const jobs: ExternalJob[] = [];
  try {
    const url = `${BASE_URL}?q=${encodeURIComponent(keyword)}&l=${encodeURIComponent(location)}&radius=30&sort=date&fromage=14`;
    const feed = await parser.parseURL(url);

    for (const item of feed.items ?? []) {
      if (!item.title || !item.link) continue;

      const { title, company, location: loc } = parseTitle(item.title, location);
      const description = item.contentSnippet || stripHtml(item.content || '') || '';

      // Extract the stable job key from the Indeed URL (?jk=...)
      const jkMatch = item.link.match(/jk=([a-f0-9]+)/);
      const externalId = jkMatch ? `indeed_${jkMatch[1]}` : `indeed_${Buffer.from(item.link).toString('base64url').slice(0, 40)}`;

      jobs.push({
        id: externalId,
        title,
        company,
        location: loc,
        description: description.slice(0, 2000),
        url: item.link,
        postedDate: item.pubDate ? new Date(item.pubDate).toISOString() : undefined,
      });
    }
  } catch (error) {
    console.error(`Indeed error (${keyword}, ${location}):`, (error as any)?.message);
  }
  return jobs;
}

export async function fetchIndeedJobs(): Promise<ExternalJob[]> {
  const allJobs: ExternalJob[] = [];
  const { keywords, locations } = await getUserSearchConfig();
  console.log(`🔍 Indeed: ${keywords.length} keywords × ${locations.length} locations`);

  for (const keyword of keywords) {
    for (const location of locations) {
      const jobs = await fetchForKeywordAndLocation(keyword, location);
      allJobs.push(...jobs);
      await new Promise(r => setTimeout(r, 800));
    }
  }

  console.log(`✅ Indeed: ${allJobs.length} jobs fetched`);
  return allJobs;
}
