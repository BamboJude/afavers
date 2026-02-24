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
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${badge.cls}`}>
      {badge.label}
    </span>
  );
};

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

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
  const [sortBy, setSortBy] = useState('created_at');
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
  }, [activeTab, search, sortBy, page]);

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
    setPage(1);
  };

  const totalPages = Math.ceil(total / LIMIT);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'new',          label: t('new'),          count: stats?.new },
    { id: 'saved',        label: t('saved'),        count: stats?.saved },
    { id: 'applied',      label: t('applied'),      count: stats?.applied },
    { id: 'interviewing', label: t('interviewing'), count: stats?.interviewing },
    { id: 'all',          label: t('all'),          count: stats?.total },
  ];

  const tabColors: Record<Tab, string> = {
    new:          'border-blue-500 text-blue-600',
    saved:        'border-yellow-500 text-yellow-600',
    applied:      'border-green-500 text-green-600',
    interviewing: 'border-purple-500 text-purple-600',
    all:          'border-gray-500 text-gray-700',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">{t('jobs')}</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg transition"
            >
              ← {t('dashboard')}
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-5 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? tabColors[tab.id]
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id ? 'bg-gray-100' : 'bg-gray-100 text-gray-500'
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <select
            value={sortBy}
            onChange={e => { setSortBy(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="created_at">{t('newestFirst')}</option>
            <option value="posted_date">{t('postedDate')}</option>
            <option value="title">{t('titleAZ')}</option>
            <option value="company">{t('companyAZ')}</option>
          </select>
        </div>
        <p className="text-xs text-gray-400 mt-2">{total.toLocaleString()} {t('jobs').toLowerCase()}</p>
      </div>

      {/* Jobs list */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="text-gray-400 mt-3 text-sm">{t('loadingJobs')}</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <p className="text-gray-400 text-lg">{t('noJobsFound')}</p>
            {activeTab === 'new' && (
              <p className="text-gray-400 text-sm mt-1">{t('allCaughtUp')} 🎉</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map(job => (
              <div
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 leading-snug">{job.title}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{job.company} · {job.location}</p>
                      </div>
                      {job.status !== 'new' && (
                        <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[job.status]}`}>
                          {t(job.status)}
                        </span>
                      )}
                    </div>

                    {job.description && (
                      <p className="text-sm text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                        {stripHtml(job.description)}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-3 text-xs text-gray-400 flex-wrap">
                      <SourceBadge source={job.source} />
                      {job.posted_date && (
                        <span>{t('posted')} {new Date(job.posted_date).toLocaleDateString('de-DE')}</span>
                      )}
                      {job.deadline && (
                        <span className="text-orange-500 font-medium">
                          {t('deadline')} {new Date(job.deadline).toLocaleDateString('de-DE')}
                        </span>
                      )}
                      {job.salary && (
                        <span className="text-green-600 font-medium">{job.salary}</span>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex flex-col gap-2 shrink-0"
                    onClick={e => e.stopPropagation()}
                  >
                    {job.status === 'new' && (
                      <button
                        onClick={e => handleSave(e, job)}
                        disabled={actionLoading === job.id}
                        title={t('saveJob')}
                        className="px-3 py-1.5 text-sm font-medium bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-lg transition disabled:opacity-40"
                      >
                        ⭐ {t('save')}
                      </button>
                    )}
                    <button
                      onClick={e => handleHide(e, job)}
                      disabled={actionLoading === job.id}
                      title={t('hideJob')}
                      className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg transition disabled:opacity-40"
                    >
                      ✕ {t('hide')}
                    </button>
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
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ← {t('prev')}
            </button>
            <span className="text-sm text-gray-600">
              {t('page')} {page} {t('of')} {totalPages}
            </span>
            <button
              onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0); }}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              {t('next')} →
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
