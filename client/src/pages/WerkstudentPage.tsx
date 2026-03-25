import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'https://server-production-ebd2b.up.railway.app';

interface WerkstudentJob {
  refnr: string;
  title: string;
  company: string;
  location: string;
  postedDate?: string;
  url: string;
}

interface SearchResult {
  jobs: WerkstudentJob[];
  total: number;
  searchTerm: string;
  locations: string[];
  userKeywords: string[];
}

const CARD_GRADIENTS = [
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-orange-500 to-amber-600',
  'from-cyan-500 to-blue-600',
  'from-green-500 to-emerald-600',
  'from-rose-500 to-pink-600',
  'from-teal-500 to-cyan-600',
];

function getInitials(company: string) {
  return company.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
}

function formatDate(d?: string) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return null; }
}

const JobCard = ({ job, index }: { job: WerkstudentJob; index: number }) => {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const initials = getInitials(job.company);
  const date = formatDate(job.postedDate);

  return (
    <a
      href={job.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:shadow-lg hover:border-green-300 dark:hover:border-green-600 transition-all active:scale-[0.98] flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        {/* Company avatar */}
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-black text-sm shrink-0`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-black text-[#0a1a25] dark:text-gray-100 leading-snug line-clamp-2 group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
            {job.title}
          </p>
          <p className="text-[12px] text-[#6f839c] dark:text-gray-400 mt-0.5 truncate">{job.company}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-[#6f839c] dark:text-gray-400">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <span className="truncate">{job.location}</span>
        </div>
        {date && (
          <span className="text-[10px] text-[#c1cbd5] dark:text-gray-500 shrink-0 ml-2">{date}</span>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-700">
        <span className="text-[11px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
          Werkstudent
        </span>
        <span className="text-[11px] font-black text-[#6f839c] dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors flex items-center gap-1">
          Bewerben →
        </span>
      </div>
    </a>
  );
};

export const WerkstudentPage = () => {
  const { token } = useAuthStore();
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [location, setLocation] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const search = useCallback(async (kw: string, loc: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (kw)  params.set('keyword',  kw);
      if (loc) params.set('location', loc);
      const res = await fetch(`${API_URL}/api/werkstudent?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { search('', ''); }, [search]);

  const handleSearch = () => {
    search(searchInput, location);
  };

  const filtered = result?.jobs.filter(j =>
    !searchInput.trim() ||
    j.title.toLowerCase().includes(searchInput.toLowerCase()) ||
    j.company.toLowerCase().includes(searchInput.toLowerCase()) ||
    j.location.toLowerCase().includes(searchInput.toLowerCase())
  ) ?? [];

  return (
    <div className="bg-[#f4f6fa] dark:bg-gray-900 min-h-screen" style={{ fontFamily: "'Figtree', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700;800;900&display=swap');`}</style>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🎓</span>
            <h1 className="text-[22px] font-black text-[#0a1a25] dark:text-gray-100">Werkstudent Jobs</h1>
            {result && (
              <span className="text-[12px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2.5 py-0.5 rounded-full">
                {result.total} found
              </span>
            )}
          </div>
          <p className="text-[13px] text-[#6f839c] dark:text-gray-400 ml-9">
            Live search from Bundesagentur für Arbeit
            {result?.locations && (
              <span> · {result.locations.join(', ')}</span>
            )}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-5 space-y-4">

        {/* Search bar */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" strokeWidth="1.5"/><path d="M21 21l-4.35-4.35" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search by title, company… e.g. Marketing, IT, Engineering"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-[#0a1a25] dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
          </div>
          <input
            type="text"
            placeholder="City (e.g. Köln)"
            value={location}
            onChange={e => setLocation(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="w-36 px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-[#0a1a25] dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition active:scale-95"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : 'Search'}
          </button>
        </div>

        {/* Preferences info bar */}
        {result?.userKeywords && result.userKeywords.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Your keywords:</span>
            {result.userKeywords.map(kw => (
              <button
                key={kw}
                onClick={() => { setSearchInput(kw); search(kw, location); }}
                className="text-[11px] font-bold px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full text-[#6f839c] dark:text-gray-400 hover:border-green-400 hover:text-green-600 dark:hover:text-green-400 transition"
              >
                {kw}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 animate-pulse">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-700 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-100 dark:bg-gray-700 rounded-lg w-4/5" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-lg w-3/5" />
                  </div>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-lg w-2/5" />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && filtered.length > 0 && (
          <>
            <p className="text-[12px] text-[#6f839c] dark:text-gray-400 font-medium">
              {filtered.length} werkstudent position{filtered.length !== 1 ? 's' : ''}
              {searchInput && ` matching "${searchInput}"`}
              {' '}across {result?.locations.join(', ')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((job, i) => (
                <JobCard key={job.refnr} job={job} index={i} />
              ))}
            </div>
          </>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-12 text-center">
            <p className="text-3xl mb-3">🎓</p>
            <p className="text-[15px] font-bold text-[#223a5a] dark:text-gray-200">No Werkstudent jobs found</p>
            <p className="text-[13px] text-[#6f839c] dark:text-gray-400 mt-1 mb-4">
              Try a different keyword or location
            </p>
            <button
              onClick={() => { setSearchInput(''); setLocation(''); search('', ''); }}
              className="px-4 py-2 text-sm font-bold text-green-600 dark:text-green-400 border border-green-200 dark:border-green-700 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition"
            >
              Reset search
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
