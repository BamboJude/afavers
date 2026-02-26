import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { jobsService } from '../services/jobs.service';
import type { DashboardStats, FollowUpAlert, Job } from '../types';
import { useLanguage } from '../store/languageStore';

export const DashboardPage = () => {
  const { isDemo } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpAlert[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState('');

  useEffect(() => {
    loadStats();
    jobsService.getFollowUps().then(setFollowUps).catch(() => {});
    jobsService.getJobs({ status: 'interviewing', limit: 20 })
      .then(r => {
        const withDate = r.jobs
          .filter(j => j.interview_date)
          .sort((a, b) => new Date(a.interview_date!).getTime() - new Date(b.interview_date!).getTime());
        setUpcomingInterviews(withDate);
      })
      .catch(() => {});
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await jobsService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchJobs = async () => {
    setFetching(true);
    setFetchMsg('');
    try {
      const result = await jobsService.fetchJobs();
      setFetchMsg(`${result.inserted ?? 0} ${t('fetchComplete')}`);
      loadStats();
    } catch {
      setFetchMsg(t('fetchFailed'));
    } finally {
      setFetching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">

      {/* Page title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard')}</h1>
        <p className="text-sm text-gray-500 mt-1">Your job search at a glance</p>
      </div>

      {/* New jobs hero banner */}
      {stats && stats.new > 0 && (
        <div
          onClick={() => navigate('/jobs')}
          className="mb-6 bg-gradient-to-r from-green-500 to-blue-600 rounded-2xl p-6 text-white cursor-pointer hover:from-green-600 hover:to-blue-700 transition shadow-lg shadow-green-100"
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">{t('unreviewedJobs')}</p>
              <p className="text-5xl font-bold tracking-tight">{stats.new.toLocaleString()}</p>
              {stats.new_today > 0 && (
                <p className="text-green-100 text-sm mt-2">+{stats.new_today} {t('addedToday')}</p>
              )}
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 px-5 py-2.5 rounded-xl text-sm font-semibold transition border border-white/30">
                {t('reviewNow')} →
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up reminders */}
      {followUps.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-2.5">⏰ Follow-ups due ({followUps.length})</p>
          <div className="space-y-1">
            {followUps.map(f => (
              <div
                key={f.id}
                onClick={() => navigate(`/jobs/${f.id}`)}
                className="flex justify-between items-center text-sm cursor-pointer hover:bg-amber-100 rounded-lg px-3 py-1.5 transition"
              >
                <span className="text-amber-900 font-medium truncate">{f.title} · {f.company}</span>
                <span className="text-amber-600 shrink-0 ml-3">{new Date(f.follow_up_date).toLocaleDateString('de-DE')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming interviews */}
      {upcomingInterviews.length > 0 && (
        <div className="mb-6 bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-purple-800 mb-2.5">📞 {t('upcomingInterviews')} ({upcomingInterviews.length})</p>
          <div className="space-y-1">
            {upcomingInterviews.map(j => (
              <div
                key={j.id}
                onClick={() => navigate(`/jobs/${j.id}`)}
                className="flex justify-between items-center text-sm cursor-pointer hover:bg-purple-100 rounded-lg px-3 py-1.5 transition"
              >
                <span className="text-purple-900 font-medium truncate">{j.title} · {j.company}</span>
                <span className="text-purple-600 shrink-0 ml-3">{new Date(j.interview_date!).toLocaleDateString('de-DE')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: t('totalJobs'),
            value: stats?.total || 0,
            icon: '📋',
            bg: 'bg-white',
            border: 'border-gray-200',
            valueColor: 'text-gray-900',
            labelColor: 'text-gray-500',
          },
          {
            label: t('saved'),
            value: stats?.saved || 0,
            icon: '⭐',
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            valueColor: 'text-yellow-900',
            labelColor: 'text-yellow-700',
            onClick: () => navigate('/jobs?tab=saved'),
          },
          {
            label: t('applied'),
            value: stats?.applied || 0,
            icon: '✅',
            bg: 'bg-green-50',
            border: 'border-green-200',
            valueColor: 'text-green-900',
            labelColor: 'text-green-700',
            sub: stats?.applied_today ? `+${stats.applied_today} today` : undefined,
            onClick: () => navigate('/kanban'),
          },
          {
            label: t('interviewing'),
            value: stats?.interviewing || 0,
            icon: '📞',
            bg: 'bg-purple-50',
            border: 'border-purple-200',
            valueColor: 'text-purple-900',
            labelColor: 'text-purple-700',
            onClick: () => navigate('/kanban'),
          },
        ].map(stat => (
          <div
            key={stat.label}
            onClick={stat.onClick}
            className={`rounded-xl border ${stat.bg} ${stat.border} p-5 ${stat.onClick ? 'cursor-pointer hover:shadow-md transition' : ''}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide ${stat.labelColor}`}>{stat.label}</p>
                <p className={`text-3xl font-bold mt-1.5 ${stat.valueColor}`}>{stat.value.toLocaleString()}</p>
                {'sub' in stat && stat.sub && (
                  <p className="text-xs text-green-600 font-medium mt-1">{stat.sub}</p>
                )}
              </div>
              <span className="text-2xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick-action grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {[
          {
            icon: '🔍',
            label: t('browseJobs'),
            desc: `${stats?.new || 0} ${t('browseJobsDesc')}`,
            color: 'hover:border-blue-300 hover:bg-blue-50/40',
            iconBg: 'bg-blue-50',
            onClick: () => navigate('/jobs'),
          },
          {
            icon: '🇬🇧',
            label: t('englishJobs'),
            desc: t('englishJobsDesc'),
            color: 'hover:border-indigo-300 hover:bg-indigo-50/40',
            iconBg: 'bg-indigo-50',
            onClick: () => navigate('/english-jobs'),
          },
          {
            icon: '🗂️',
            label: t('applicationsBoard'),
            desc: `${(stats?.saved || 0) + (stats?.applied || 0) + (stats?.interviewing || 0)} ${t('applicationsBoardDesc')}`,
            color: 'hover:border-purple-300 hover:bg-purple-50/40',
            iconBg: 'bg-purple-50',
            onClick: () => navigate('/kanban'),
          },
          {
            icon: '📊',
            label: 'Analytics',
            desc: 'Track your progress',
            color: 'hover:border-pink-300 hover:bg-pink-50/40',
            iconBg: 'bg-pink-50',
            onClick: () => navigate('/analytics'),
          },
        ].map(card => (
          <button
            key={card.label}
            onClick={card.onClick}
            className={`bg-white rounded-xl border-2 border-gray-200 ${card.color} p-5 text-left transition group`}
          >
            <div className={`w-10 h-10 ${card.iconBg} rounded-lg flex items-center justify-center text-xl mb-3`}>
              {card.icon}
            </div>
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 mb-0.5">{card.label}</h3>
            <p className="text-xs text-gray-400 leading-snug">{card.desc}</p>
          </button>
        ))}

        {/* Fetch jobs card */}
        <div className="bg-white rounded-xl border-2 border-gray-200 p-5">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-xl mb-3">🔄</div>
          <h3 className="text-sm font-semibold text-gray-900 mb-0.5">{t('fetchJobs')}</h3>
          <p className="text-xs text-gray-400 leading-snug mb-3">{t('autoFetchNote')}</p>
          <button
            onClick={handleFetchJobs}
            disabled={fetching || isDemo}
            title={isDemo ? 'Not available in demo mode' : undefined}
            className="w-full px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
          >
            {fetching ? t('fetching') : t('fetchNow')}
          </button>
          {fetchMsg && (
            <p className={`text-xs mt-1.5 text-center ${fetchMsg.includes('failed') || fetchMsg.includes('fehlgeschlagen') ? 'text-red-500' : 'text-green-600'}`}>
              {fetchMsg}
            </p>
          )}
        </div>
      </div>

      {/* Pipeline summary */}
      {((stats?.applied || 0) + (stats?.interviewing || 0) + (stats?.offered || 0) + (stats?.rejected || 0)) > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">{t('applicationPipeline')}</h3>
          <div className="flex flex-wrap gap-5">
            {[
              { label: t('saved'),        value: stats?.saved || 0,        dot: 'bg-yellow-400' },
              { label: t('applied'),      value: stats?.applied || 0,      dot: 'bg-green-500' },
              { label: t('interviewing'), value: stats?.interviewing || 0, dot: 'bg-purple-500' },
              { label: t('offered'),      value: stats?.offered || 0,      dot: 'bg-emerald-500' },
              { label: t('rejected'),     value: stats?.rejected || 0,     dot: 'bg-red-400' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${s.dot} shrink-0`}></div>
                <span className="text-sm text-gray-500">{s.label}</span>
                <span className="text-sm font-bold text-gray-800">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
