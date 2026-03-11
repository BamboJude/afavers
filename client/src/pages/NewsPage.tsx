import { useEffect, useState } from 'react';
import { newsService, type NewsItem, isEnergyArticle, getImageUrl, timeAgo } from '../services/news.service';

type Tab = 'energy' | 'economy' | 'all';

const TABS: { key: Tab; label: string; de: string }[] = [
  { key: 'energy',  label: 'Energy & Climate', de: 'Energie & Klima' },
  { key: 'economy', label: 'Economy',           de: 'Wirtschaft' },
  { key: 'all',     label: 'All News',          de: 'Alle Nachrichten' },
];

const RESSORT_COLORS: Record<string, string> = {
  wirtschaft: 'bg-blue-100 text-blue-700',
  inland:     'bg-green-100 text-green-700',
  ausland:    'bg-purple-100 text-purple-700',
  sport:      'bg-orange-100 text-orange-700',
  wissen:     'bg-teal-100 text-teal-700',
};

const NewsCardSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
    <div className="h-40 bg-gray-200" />
    <div className="p-4">
      <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-full mb-1" />
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-full mb-1" />
      <div className="h-3 bg-gray-100 rounded w-2/3" />
    </div>
  </div>
);

const NewsCard = ({ item }: { item: NewsItem }) => {
  const img = getImageUrl(item);
  const isEnergy = isEnergyArticle(item);
  const badgeClass = isEnergy ? 'bg-emerald-100 text-emerald-700' : (RESSORT_COLORS[item.ressort ?? ''] ?? 'bg-gray-100 text-gray-600');
  const badgeLabel = isEnergy ? 'Energy & Climate' : (item.topline ?? item.ressort ?? 'News');

  return (
    <a
      href={item.detailsweb}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 hover:shadow-md transition-all duration-200 active:scale-[0.99] flex flex-col"
    >
      {img && (
        <div className="h-40 overflow-hidden bg-gray-100 shrink-0">
          <img
            src={img}
            alt={item.teaserImage?.alttext ?? item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
            {badgeLabel}
          </span>
          <span className="text-xs text-gray-400">{timeAgo(item.date)}</span>
        </div>
        <h3 className="text-sm font-semibold text-gray-900 leading-snug mb-1.5 line-clamp-3">
          {item.title}
        </h3>
        {item.firstSentence && (
          <p className="text-xs text-gray-500 line-clamp-3 flex-1">{item.firstSentence}</p>
        )}
        <div className="flex items-center gap-1 mt-3 text-xs text-gray-400 font-medium">
          <span>Read on Tagesschau</span>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
      </div>
    </a>
  );
};

export const NewsPage = () => {
  const [tab, setTab]         = useState<Tab>('energy');
  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [economy, setEconomy] = useState<NewsItem[]>([]);
  const [energy, setEnergy]   = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchNews = async () => {
    setLoading(true);
    setError(false);
    try {
      const [allData, wirtschaftData] = await Promise.all([
        newsService.getAll(),
        newsService.getWirtschaft(),
      ]);
      setAllNews(allData);
      setEconomy(wirtschaftData);
      setEnergy([
        ...wirtschaftData.filter(isEnergyArticle),
        ...allData.filter(n => isEnergyArticle(n) && !wirtschaftData.find(w => w.sophoraId === n.sophoraId)),
      ]);
      setLastFetched(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNews(); }, []);

  const displayed = tab === 'energy' ? energy : tab === 'economy' ? economy : allNews;

  return (
    <div className="px-4 py-6 max-w-5xl mx-auto w-full">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">News</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            German news powered by{' '}
            <a href="https://www.tagesschau.de" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 transition">
              Tagesschau
            </a>
            {lastFetched && (
              <span className="ml-2">· Updated {timeAgo(lastFetched.toISOString())}</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchNews}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-40"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Note: articles in German */}
      {tab === 'energy' && !loading && energy.length === 0 && !error && (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="font-medium">No energy news found right now</p>
          <p className="text-sm mt-1">Check back shortly — articles refresh hourly</p>
        </div>
      )}

      {error && (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="font-medium">Could not load news</p>
          <button onClick={fetchNews} className="text-sm mt-2 text-green-600 hover:underline">Try again</button>
        </div>
      )}

      {/* Grid */}
      {!error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 6 }, (_, i) => <NewsCardSkeleton key={i} />)
            : displayed.map(item => <NewsCard key={item.sophoraId} item={item} />)
          }
        </div>
      )}

      {/* Language note */}
      {!loading && displayed.length > 0 && (
        <p className="text-center text-xs text-gray-300 mt-8">
          Articles are in German · Source: Tagesschau (ARD)
        </p>
      )}
    </div>
  );
};
