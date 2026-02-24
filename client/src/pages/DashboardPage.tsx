import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { jobsService } from '../services/jobs.service';
import type { DashboardStats } from '../types';

export const DashboardPage = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState('');

  useEffect(() => {
    loadStats();
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
      setFetchMsg(`Done — ${result.inserted ?? 0} new jobs added`);
      loadStats();
    } catch {
      setFetchMsg('Fetch failed. Try again.');
    } finally {
      setFetching(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <img src="/logo.png" alt="afavers" className="h-20" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-lg transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <>
            {/* New jobs banner */}
            {stats && stats.new > 0 && (
              <div
                onClick={() => navigate('/jobs')}
                className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white cursor-pointer hover:from-blue-700 hover:to-indigo-700 transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-blue-200 text-sm font-medium mb-1">Unreviewed jobs</p>
                    <p className="text-4xl font-bold">{stats.new.toLocaleString()}</p>
                    {stats.new_today > 0 && (
                      <p className="text-blue-200 text-sm mt-1">+{stats.new_today} added today</p>
                    )}
                  </div>
                  <span className="border-2 border-white border-opacity-60 hover:bg-white hover:bg-opacity-20 px-5 py-2.5 rounded-lg text-sm font-semibold transition text-white">
                    Review now →
                  </span>
                </div>
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Jobs',   value: stats?.total || 0,        icon: '📋', color: 'bg-gray-50 border-gray-200',      text: 'text-gray-600' },
                { label: 'Saved',        value: stats?.saved || 0,        icon: '⭐', color: 'bg-yellow-50 border-yellow-200',  text: 'text-yellow-700', onClick: () => navigate('/jobs') },
                { label: 'Applied',      value: stats?.applied || 0,      icon: '✅', color: 'bg-green-50 border-green-200',   text: 'text-green-700',  onClick: () => navigate('/kanban') },
                { label: 'Interviewing', value: stats?.interviewing || 0, icon: '📞', color: 'bg-purple-50 border-purple-200', text: 'text-purple-700', onClick: () => navigate('/kanban') },
              ].map(stat => (
                <div
                  key={stat.label}
                  onClick={stat.onClick}
                  className={`rounded-xl border-2 ${stat.color} p-5 ${stat.onClick ? 'cursor-pointer hover:shadow-md transition' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`text-sm font-medium ${stat.text}`}>{stat.label}</p>
                      <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value.toLocaleString()}</p>
                    </div>
                    <span className="text-2xl">{stat.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Action cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              <button
                onClick={() => navigate('/jobs')}
                className="bg-white rounded-xl border-2 border-gray-200 hover:border-blue-400 p-6 text-left transition group"
              >
                <div className="text-3xl mb-3">🔍</div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 mb-1">Browse & Triage Jobs</h3>
                <p className="text-sm text-gray-500">
                  {stats?.new || 0} new jobs waiting — save or dismiss with one click
                </p>
              </button>

              <button
                onClick={() => navigate('/kanban')}
                className="bg-white rounded-xl border-2 border-gray-200 hover:border-purple-400 p-6 text-left transition group"
              >
                <div className="text-3xl mb-3">🗂️</div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-700 mb-1">Applications Board</h3>
                <p className="text-sm text-gray-500">
                  {(stats?.saved || 0) + (stats?.applied || 0) + (stats?.interviewing || 0)} tracked — drag between stages
                </p>
              </button>

              <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                <div className="text-3xl mb-3">🔄</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Fetch Jobs</h3>
                <p className="text-sm text-gray-500 mb-4">Auto-runs every 2 hours. Trigger manually anytime.</p>
                <button
                  onClick={handleFetchJobs}
                  disabled={fetching}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
                >
                  {fetching ? 'Fetching...' : 'Fetch Now'}
                </button>
                {fetchMsg && (
                  <p className={`text-xs mt-2 text-center ${fetchMsg.includes('failed') ? 'text-red-500' : 'text-green-600'}`}>
                    {fetchMsg}
                  </p>
                )}
              </div>
            </div>

            {/* Pipeline summary */}
            {((stats?.applied || 0) + (stats?.interviewing || 0) + (stats?.offered || 0) + (stats?.rejected || 0)) > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Application Pipeline</h3>
                <div className="flex flex-wrap gap-4 text-sm">
                  {[
                    { label: 'Saved',        value: stats?.saved || 0,        dot: 'bg-yellow-400' },
                    { label: 'Applied',      value: stats?.applied || 0,      dot: 'bg-green-400' },
                    { label: 'Interviewing', value: stats?.interviewing || 0, dot: 'bg-purple-400' },
                    { label: 'Offered',      value: stats?.offered || 0,      dot: 'bg-emerald-400' },
                    { label: 'Rejected',     value: stats?.rejected || 0,     dot: 'bg-red-300' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`}></div>
                      <span className="text-gray-500">{s.label}</span>
                      <span className="font-bold text-gray-800">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
