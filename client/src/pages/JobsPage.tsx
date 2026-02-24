import { useState, useEffect, useRef } from 'react';
import { jobsService } from '../services/jobs.service';
import type { Job, JobFilters, DashboardStats } from '../types';
import { useNavigate } from 'react-router-dom';

type Tab = 'new' | 'saved' | 'applied' | 'interviewing' | 'all';

const STATUS_COLORS: Record<string, string> = {
  new:          'bg-blue-100 text-blue-700',
  saved:        'bg-yellow-100 text-yellow-700',
  applied:      'bg-green-100 text-green-700',
  interviewing: 'bg-purple-100 text-purple-700',
  offered:      'bg-emerald-100 text-emerald-700',
  rejected:     'bg-red-100 text-red-600',
};

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export const JobsPage = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<Tab>('new');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [englishOnly, setEnglishOnly] = useState(false);
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
  }, [activeTab, search, sortBy, page, englishOnly]);

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
        language: englishOnly ? 'en' : undefined,
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
      // Remove from current tab view if we're on "new"
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
    { id: 'new',          label: 'New',          count: stats?.new },
    { id: 'saved',        label: 'Saved',        count: stats?.saved },
    { id: 'applied',      label: 'Applied',      count: stats?.applied },
    { id: 'interviewing', label: 'Interviewing', count: stats?.interviewing },
    { id: 'all',          label: 'All',          count: stats?.total },
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
            <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg transition"
            >
              ← Dashboard
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
            placeholder="Search by title, company or location..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <select
            value={sortBy}
            onChange={e => { setSortBy(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="created_at">Newest first</option>
            <option value="posted_date">Posted date</option>
            <option value="title">Title A–Z</option>
            <option value="company">Company A–Z</option>
          </select>
          <button
            onClick={() => { setEnglishOnly(v => !v); setPage(1); }}
            title={englishOnly ? 'Showing English jobs only — click to show all' : 'Click to show English jobs only'}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
              englishOnly
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
            }`}
          >
            🇬🇧 English only
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {total.toLocaleString()} jobs
          {englishOnly && <span className="ml-1 text-blue-500">· English only</span>}
        </p>
      </div>

      {/* Jobs list */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p className="text-gray-400 mt-3 text-sm">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <p className="text-gray-400 text-lg">No jobs found</p>
            {activeTab === 'new' && (
              <p className="text-gray-400 text-sm mt-1">All caught up! 🎉</p>
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
                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 leading-snug">{job.title}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{job.company} · {job.location}</p>
                      </div>
                      {/* Status badge — only show if not "new" */}
                      {job.status !== 'new' && (
                        <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[job.status]}`}>
                          {job.status}
                        </span>
                      )}
                    </div>

                    {/* Description snippet */}
                    {job.description && (
                      <p className="text-sm text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                        {stripHtml(job.description)}
                      </p>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                      {job.posted_date && (
                        <span>Posted {new Date(job.posted_date).toLocaleDateString('de-DE')}</span>
                      )}
                      {job.deadline && (
                        <span className="text-orange-500 font-medium">
                          Deadline {new Date(job.deadline).toLocaleDateString('de-DE')}
                        </span>
                      )}
                      {job.salary && (
                        <span className="text-green-600 font-medium">{job.salary}</span>
                      )}
                    </div>
                  </div>

                  {/* Quick action buttons */}
                  <div
                    className="flex flex-col gap-2 shrink-0"
                    onClick={e => e.stopPropagation()}
                  >
                    {job.status === 'new' && (
                      <button
                        onClick={e => handleSave(e, job)}
                        disabled={actionLoading === job.id}
                        title="Save this job"
                        className="px-3 py-1.5 text-sm font-medium bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-lg transition disabled:opacity-40"
                      >
                        ⭐ Save
                      </button>
                    )}
                    <button
                      onClick={e => handleHide(e, job)}
                      disabled={actionLoading === job.id}
                      title="Hide this job"
                      className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg transition disabled:opacity-40"
                    >
                      ✕ Hide
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
              ← Prev
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0); }}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next →
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
