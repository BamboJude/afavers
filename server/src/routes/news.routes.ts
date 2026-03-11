import { Router, Request, Response } from 'express';

const router = Router();
const TAGESSCHAU_BASE = 'https://www.tagesschau.de/api2u';

// Simple in-memory cache: 15 minutes
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 90 * 60 * 1000;
const MAX_ARTICLES = 50;

async function fetchWithCache(url: string): Promise<unknown> {
  const cached = cache.get(url);
  if (cached && Date.now() < cached.expires) return cached.data;

  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'afavers-app/1.0' },
  });
  if (!res.ok) throw new Error(`Tagesschau API error: ${res.status}`);
  const data = await res.json() as { news?: unknown[] };
  if (Array.isArray(data.news)) data.news = data.news.slice(0, MAX_ARTICLES);
  cache.set(url, { data, expires: Date.now() + CACHE_TTL });
  return data;
}

// GET /api/news?ressort=wirtschaft
router.get('/', async (req: Request, res: Response) => {
  try {
    const ressort = req.query.ressort as string | undefined;
    const url = ressort
      ? `${TAGESSCHAU_BASE}/news/?ressort=${encodeURIComponent(ressort)}`
      : `${TAGESSCHAU_BASE}/news/`;
    const data = await fetchWithCache(url);
    res.json(data);
  } catch (err) {
    console.error('News proxy error:', err);
    res.status(502).json({ error: 'Failed to fetch news' });
  }
});

export default router;
