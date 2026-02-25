import { useState, useEffect, useRef } from 'react';
import { jobsService } from '../services/jobs.service';
import type { Job, JobFilters, DashboardStats } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../store/languageStore';

type Tab = 'new' | 'saved' | 'applied' | 'interviewing' | 'all';

const STATUS_COLORS: Record<string, string> = {
  new:          'bg-blue-100 text-blue-700',
  saved:        'bg-yellow-100 text-yellow-700',
  applied:      'bg-green-100 text-green-700',
  interviewing: 'bg-purple-100 text-purple-700',
  offered:      'bg-emerald-100 text-emerald-700',
  rejected:     'bg-red-100 text-red-600',
};

const SOURCE_BADGES: Record<string, { label: string; cls: string }> = {
  bundesagentur: { label: 'Bundesagentur', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  adzuna:        { label: 'Adzuna',        cls: 'bg-orange-50 text-orange-600 border-orange-200' },
  greenjobs:     { label: 'GreenJobs',     cls: 'bg-green-50 text-green-700 border-green-200' },
};

const SourceBadge = ({ source }: { source: string }) => {
  const badge = SOURCE_BADGES[source.toLowerCase()] ?? { label: source, cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${badge.cls}`}>
      {badge.label}
    </span>
  );
};

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const deadlineUrgency = (deadline: string | null): string => {
  if (!deadline) return '';
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days < 0)  return 'border-red-400 bg-red-50';
  if (days <= 3) return 'border-red-300 bg-red-50';
  if (days <= 7) return 'border-orange-300 bg-orange-50';
  return '';
};

const CompanyAvatar = ({ company }: { company: string }) => {
  const letter = company?.trim()?.[0]?.toUpperCase() ?? '?';
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-orange-100 text-orange-700',
    'bg-pink-100 text-pink-700',
    'bg-teal-100 text-teal-700',
    'bg-indigo-100 text-indigo-700',
  ];
  const idx = letter.charCodeAt(0) % colors.length;
  return (
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold shrink-0 ${colors[idx]}`}>
      {letter}
    </div>
  );
};

export const JobsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const initialTab = (searchParams.get('tab') as Tab) || 'new';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('posted_date');
  const [sourceFilter, setSourceFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const LIMIT = 50;

  useEffect(() => {
    loadStats();
  }, []);

  // Debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchInput]);

  useEffect(() => {
    fetchJobs();
  }, [activeTab, search, sortBy, sourceFilter, dateFilter, page]);

  const loadStats = async () => {
    try {
      const s = await jobsService.getStats();
      setStats(s);
    } catch {}
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const filters: JobFilters = {
        limit: LIMIT,
        offset: (page - 1) * LIMIT,
        sortBy,
        sortOrder: 'DESC',
        search: search || undefined,
        status: activeTab !== 'all' ? activeTab : undefined,
        noFilter: activeTab === 'all' ? true : undefined,
        source: sourceFilter || undefined,
        dateFrom: dateFilter || undefined,
      };
      const response = await jobsService.getJobs(filters);
      setJobs(response.jobs);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    setActionLoading(job.id);
    try {
      await jobsService.updateStatus(job.id, 'saved');
      if (activeTab === 'new') {
        setJobs(prev => prev.filter(j => j.id !== job.id));
        setTotal(prev => prev - 1);
      } else {
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'saved' } : j));
      }
      setStats(prev => prev ? { ...prev, new: Math.max(0, prev.new - 1), saved: prev.saved + 1 } : prev);
    } catch {}
    setActionLoading(null);
  };

  const handleHide = async (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    setActionLoading(job.id);
    try {
      await jobsService.toggleHidden(job.id, true);
      setJobs(prev => prev.filter(j => j.id !== job.id));
      setTotal(prev => prev - 1);
      if (job.status === 'new') {
        setStats(prev => prev ? { ...prev, new: Math.max(0, prev.new - 1), total: Math.max(0, prev.total - 1) } : prev);
      }
    } catch {}
    setActionLoading(null);
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSourceFilter('');
    setDateFilter('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / LIMIT);

  const DATE_OPTIONS = [
    { value: '',   label: t('anyTime') },
    { value: '7',  label: t('last7Days') },
    { value: '30', label: t('last30Days') },
    { value: '90', label: t('last3Months') },
  ];

  const dateFromForDays = (days: string) => {
    if (!days) return '';
    const d = new Date();
    d.setDate(d.getDate() - parseInt(days));
    return d.toISOString().split('T')[0];
  };

  const tabs: { id: Tab; label: string; count?: number; color: string; activeColor: string }[] = [
    { id: 'new',          label: t('new'),          count: stats?.new,          color: 'hover:text-blue-600',   activeColor: 'border-blue-500 text-blue-600' },
    { id: 'saved',        label: t('saved'),        count: stats?.saved,        color: 'hover:text-yellow-600', activeColor: 'border-yellow-500 text-yellow-600' },
    { id: 'applied',      label: t('applied'),      count: stats?.applied,      color: 'hover:text-green-600',  activeColor: 'border-green-500 text-green-600' },
    { id: 'interviewing', label: t('interviewing'), count: stats?.interviewing, color: 'hover:text-purple-600', activeColor: 'border-purple-500 text-purple-600' },
    { id: 'all',          label: t('all'),          count: stats?.total,        color: 'hover:text-gray-700',   activeColor: 'border-gray-500 text-gray-700' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 w-full">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">{t('jobs')}</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 overflow-hidden">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-5 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? tab.activeColor
                    : `border-transparent text-gray-400 ${tab.color}`
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 ${
                    activeTab === tab.id ? 'text-gray-700' : 'text-gray-400'
                  }`}>
                    {tab.count.toLocaleString()}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search + Sort bar */}
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-48 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-white"
            />
          </div>
          <select
            value={sortBy}
            onChange={e => { setSortBy(e.target.value); setPage(1); }}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="posted_date">{t('newestFirst')}</option>
            <option value="created_at">{t('recentlyAdded')}</option>
            <option value="title">{t('titleAZ')}</option>
            <option value="company">{t('companyAZ')}</option>
          </select>
        </div>
        {/* Source filter pills */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {[
            { value: '',              label: t('allSources') },
            { value: 'bundesagentur', label: 'Bundesagentur' },
            { value: 'adzuna',        label: 'Adzuna' },
            { value: 'greenjobs',     label: 'GreenJobs' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => { setSourceFilter(opt.value); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                sourceFilter === opt.value
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {/* Date filter pills */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {DATE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setDateFilter(dateFromForDays(opt.value)); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                dateFilter === dateFromForDays(opt.value)
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">{total.toLocaleString()} {t('jobs').toLowerCase()}</p>
      </div>

      {/* Jobs list */}
      <main className="max-w-5xl mx-auto px-6 pb-12">
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="text-gray-400 mt-3 text-sm">{t('loadingJobs')}</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-gray-500 text-base font-medium">{t('noJobsFound')}</p>
            {activeTab === 'new' && (
              <p className="text-gray-400 text-sm mt-1">{t('allCaughtUp')} 🎉</p>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {jobs.map(job => (
              <div
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className={`bg-white rounded-xl border hover:shadow-md transition cursor-pointer group ${
                  deadlineUrgency(job.deadline) || 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    {/* Company avatar — hidden on small screens */}
                    <div className="hidden sm:block shrink-0">
                      <CompanyAvatar company={job.company} />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 leading-snug group-hover:text-blue-700 transition-colors text-sm sm:text-base">
                            {job.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                            {job.company}
                            {job.location && <span className="text-gray-400"> · {job.location}</span>}
                          </p>
                        </div>
                        {job.status !== 'new' && (
                          <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[job.status]}`}>
                            {t(job.status)}
                          </span>
                        )}
                      </div>

                      {job.description && (
                        <p className="text-xs sm:text-sm text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
                          {stripHtml(job.description)}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 flex-wrap">
                        <SourceBadge source={job.source} />
                        {job.posted_date && (
                          <span className="hidden sm:inline">{t('posted')} {new Date(job.posted_date).toLocaleDateString('de-DE')}</span>
                        )}
                        {job.deadline && (
                          <span className="text-orange-500 font-medium">
                            ⏰ {new Date(job.deadline).toLocaleDateString('de-DE')}
                          </span>
                        )}
                        {job.salary && (
                          <span className="text-green-600 font-medium">{job.salary}</span>
                        )}
                      </div>

                      {/* Actions — below content on mobile, to the right on desktop */}
                      <div
                        className="flex gap-2 mt-3 sm:hidden"
                        onClick={e => e.stopPropagation()}
                      >
                        {job.status === 'new' && (
                          <button
                            onClick={e => handleSave(e, job)}
                            disabled={actionLoading === job.id}
                            className="flex-1 py-1.5 text-xs font-semibold bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-lg transition disabled:opacity-40"
                          >
                            ⭐ {t('save')}
                          </button>
                        )}
                        <button
                          onClick={e => handleHide(e, job)}
                          disabled={actionLoading === job.id}
                          className="flex-1 py-1.5 text-xs font-semibold text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg transition disabled:opacity-40"
                        >
                          ✕ {t('hide')}
                        </button>
                      </div>
                    </div>

                    {/* Actions — right column on sm+ screens only */}
                    <div
                      className="hidden sm:flex flex-col gap-2 shrink-0"
                      onClick={e => e.stopPropagation()}
                    >
                      {job.status === 'new' && (
                        <button
                          onClick={e => handleSave(e, job)}
                          disabled={actionLoading === job.id}
                          title={t('saveJob')}
                          className="px-3 py-1.5 text-xs font-semibold bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-lg transition disabled:opacity-40 whitespace-nowrap"
                        >
                          ⭐ {t('save')}
                        </button>
                      )}
                      <button
                        onClick={e => handleHide(e, job)}
                        disabled={actionLoading === job.id}
                        title={t('hideJob')}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg transition disabled:opacity-40"
                      >
                        ✕ {t('hide')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-8">
            <button
              onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0); }}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ← {t('prev')}
            </button>
            <span className="text-sm text-gray-500 font-medium">
              {t('page')} {page} {t('of')} {totalPages}
            </span>
            <button
              onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0); }}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {t('next')} →
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
