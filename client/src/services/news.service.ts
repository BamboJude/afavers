const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const BASE = `${API_URL}/api/news`;

export interface NewsItem {
  sophoraId: string;
  title: string;
  firstSentence: string;
  date: string;
  detailsweb: string;
  topline?: string;
  ressort?: string;
  teaserImage?: {
    alttext?: string;
    imageVariants?: Record<string, string>;
  };
}

interface NewsResponse {
  news: NewsItem[];
}

const ENERGY_KEYWORDS = [
  'energie', 'solar', 'wind', 'klima', 'nachhaltigkeit', 'umwelt',
  'strom', 'erneuerbar', 'co2', 'wärmepumpe', 'photovoltaik', 'gas',
  'öl', 'kohle', 'emissionen', 'klimaschutz', 'energiewende',
  'wasserstoff', 'batterie', 'netz', 'strompreis',
];

export function isEnergyArticle(item: NewsItem): boolean {
  const text = `${item.title} ${item.firstSentence ?? ''} ${item.topline ?? ''}`.toLowerCase();
  return ENERGY_KEYWORDS.some(kw => text.includes(kw));
}

export function getImageUrl(item: NewsItem): string | null {
  const variants = item.teaserImage?.imageVariants;
  if (!variants) return null;
  return variants['16x9-960'] ?? variants['16x9-480'] ?? variants['1x1-840'] ?? Object.values(variants)[0] ?? null;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const newsService = {
  async getWirtschaft(): Promise<NewsItem[]> {
    const res = await fetch(`${BASE}?ressort=wirtschaft`);
    if (!res.ok) throw new Error('Failed to fetch news');
    const data: NewsResponse = await res.json();
    return data.news ?? [];
  },

  async getAll(): Promise<NewsItem[]> {
    const res = await fetch(`${BASE}`);
    if (!res.ok) throw new Error('Failed to fetch news');
    const data: NewsResponse = await res.json();
    return data.news ?? [];
  },

  async getEnergy(): Promise<NewsItem[]> {
    const [wirtschaft, all] = await Promise.all([
      newsService.getWirtschaft(),
      newsService.getAll(),
    ]);
    const combined = [...wirtschaft, ...all];
    const seen = new Set<string>();
    const unique = combined.filter(item => {
      if (seen.has(item.sophoraId)) return false;
      seen.add(item.sophoraId);
      return true;
    });
    return unique.filter(isEnergyArticle);
  },
};
