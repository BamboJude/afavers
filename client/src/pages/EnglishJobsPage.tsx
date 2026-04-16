import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsService } from '../services/jobs.service';
import type { Job } from '../types';
import { useLanguage } from '../store/languageStore';
import { useSwipeAction } from '../hooks/useSwipeAction';

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const deadlineUrgency = (deadline: string | null): string => {
  if (!deadline) return '';
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days < 0)  return 'border-red-400 bg-red-50';
  if (days <= 3) return 'border-red-300 bg-red-50';
  if (days <= 7) return 'border-orange-300 bg-orange-50';
  return '';
};

const STATUS_COLORS: Record<string, string> = {
  new:          'bg-blue-100 text-blue-700',
  saved:        'bg-yellow-100 text-yellow-700',
  preparing:    'bg-blue-100 text-blue-700',
  applied:      'bg-green-100 text-green-700',
  followup:     'bg-orange-100 text-orange-700',
  interviewing: 'bg-purple-100 text-purple-700',
  offered:      'bg-emerald-100 text-emerald-700',
  rejected:     'bg-red-100 text-red-600',
  archived:     'bg-gray-100 text-gray-600',
};

const SOURCE_BADGES: Record<string, { label: string; cls: string }> = {
  bundesagentur: { label: 'Bundesagentur', cls: 'bg-blue-50 text-blue-600 border-blue-200' },
  stepstone:     { label: 'StepStone',     cls: 'bg-orange-50 text-orange-600 border-orange-200' },
  adzuna:        { label: 'Adzuna',        cls: 'bg-purple-50 text-purple-600 border-purple-200' },
};

const SourceBadge = ({ source }: { source: string }) => {
  const badge = SOURCE_BADGES[source.toLowerCase()] ?? { label: source, cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${badge.cls}`}>
      {badge.label}
    </span>
  );
};

/** Wraps a job card with swipe-to-save (right) and swipe-to-hide (left) gestures. */
const SwipeableCard = ({
  onSave,
  onHide,
  children,
}: {
  onSave?: () => void;
  onHide: () => void;
  children: React.ReactNode;
}) => {
  const { touchHandlers, cardStyle, bgOpacity, action } = useSwipeAction(
    onSave ?? (() => {}),
    onHide,
  );
  const visibleAction = action === 'save' && !onSave ? null : action;

  return (
    <div className="relative overflow-hidden rounded-xl">
      {visibleAction && (
        <div
          className={`absolute inset-0 flex items-center ${
            visibleAction === 'save' ? 'pl-5 bg-yellow-400' : 'justify-end pr-5 bg-gray-400'
          }`}
          style={{ opacity: bgOpacity }}
        >
          <span className="text-white text-sm font-bold select-none">
            {visibleAction === 'save' ? '⭐ Save' : 'Hide ✕'}
          </span>
        </div>
      )}
      <div {...touchHandlers} style={cardStyle}>
        {children}
      </div>
    </div>
  );
};

const LIMIT = 50;

export const EnglishJobsPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, [search, page]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await jobsService.getJobs({
        language: 'en',
        noFilter: true,
        limit: LIMIT,
        offset: (page - 1) * LIMIT,
        sortBy: 'created_at',
        sortOrder: 'DESC',
        search: search || undefined,
      });
      setJobs(response.jobs);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch English jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (job: Job) => {
    setActionLoading(job.id);
    try {
      await jobsService.updateStatus(job.id, 'saved');
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: 'saved' } : j));
    } catch {}
    setActionLoading(null);
  };

  const handleHide = async (job: Job) => {
    setActionLoading(job.id);
    try {
      await jobsService.toggleHidden(job.id, true);
      setJobs(prev => prev.filter(j => j.id !== job.id));
      setTotal(prev => prev - 1);
    } catch {}
    setActionLoading(null);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🇬🇧</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('englishJobsTitle')}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{t('englishJobsDesc')}</p>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent outline-none text-sm bg-white"
          />
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
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <p className="text-4xl mb-4">🇬🇧</p>
            <p className="text-gray-600 text-lg font-medium">{t('noEnglishJobs')}</p>
            <p className="text-gray-400 text-sm mt-2">{t('noEnglishJobsHint')}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
            >
              ← {t('dashboard')}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map(job => (
              <SwipeableCard
                key={job.id}
                onSave={job.status === 'new' ? () => handleSave(job) : undefined}
                onHide={() => handleHide(job)}
              >
                <div
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className={`bg-white rounded-xl border p-5 hover:shadow-md transition cursor-pointer ${deadlineUrgency(job.deadline) || 'border-gray-200 hover:border-gray-300'}`}
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
                          <span>{t('posted')} {new Date(job.posted_date).toLocaleDateString('en-GB')}</span>
                        )}
                        {job.deadline && (
                          <span className="text-orange-500 font-medium">
                            {t('deadline')} {new Date(job.deadline).toLocaleDateString('en-GB')}
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
                          onClick={e => { e.stopPropagation(); handleSave(job); }}
                          disabled={actionLoading === job.id}
                          className="px-3 py-1.5 text-sm font-medium bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-lg transition disabled:opacity-40"
                        >
                          ⭐ {t('save')}
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); handleHide(job); }}
                        disabled={actionLoading === job.id}
                        className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg transition disabled:opacity-40"
                      >
                        ✕ {t('hide')}
                      </button>
                    </div>
                  </div>
                </div>
              </SwipeableCard>
            ))}
          </div>
        )}

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
