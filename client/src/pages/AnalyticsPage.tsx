import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsService } from '../services/jobs.service';
import type { AnalyticsData } from '../types';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { DemoBanner } from '../components/common/DemoBanner';

const SOURCE_LABELS: Record<string, string> = {
  bundesagentur: 'Bundesagentur',
  adzuna: 'Adzuna',
  greenjobs: 'GreenJobs',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-400',
  saved: 'bg-yellow-400',
  applied: 'bg-green-400',
  interviewing: 'bg-purple-400',
  offered: 'bg-emerald-400',
  rejected: 'bg-red-400',
};

const Bar = ({ value, max, color }: { value: number; max: number; color: string }) => (
  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
    <div
      className={`h-full rounded-full transition-all ${color}`}
      style={{ width: max > 0 ? `${Math.round((value / max) * 100)}%` : '0%' }}
    />
  </div>
);

export const AnalyticsPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await jobsService.exportCsv();
    } catch {
      alert('Export failed — try again');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    jobsService.getAnalytics()
      .then(setData)
      .catch((err) => {
        console.error(err);
        setError(err?.response?.data?.error || err?.message || 'Unknown error');
      })
      .finally(() => setLoading(false));
  }, []);

  const totalApplied = data?.byStatus.find(s => s.status === 'applied')?.count ?? 0;
  const totalInterviewing = data?.byStatus.find(s => s.status === 'interviewing')?.count ?? 0;
  const totalOffered = data?.byStatus.find(s => s.status === 'offered')?.count ?? 0;
  const responseRate = totalApplied > 0
    ? Math.round(((totalInterviewing + totalOffered) / totalApplied) * 100)
    : 0;

  const maxSource = Math.max(...(data?.bySource.map(s => s.count) ?? [1]));
  const maxWeek   = Math.max(...(data?.byWeek.map(w => w.count) ?? [1]));
  const maxStatus = Math.max(...(data?.byStatus.map(s => s.count) ?? [1]));

  return (
    <div className="min-h-screen bg-gray-50">
      <DemoBanner />
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">📊 Analytics</h1>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button
              onClick={handleExport}
              disabled={exporting}
              className="text-sm text-green-700 hover:text-green-900 border border-green-300 hover:border-green-500 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : '⬇ Export CSV'}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-gray-500 hover:text-gray-800 border border-gray-200 px-4 py-2 rounded-lg transition"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-300 rounded-xl p-6 text-center">
            <p className="text-red-700 font-semibold mb-1">Failed to load analytics</p>
            <p className="text-red-500 text-sm font-mono">{error}</p>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Applied',      value: totalApplied,      color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
                { label: 'Interviewing', value: totalInterviewing, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
                { label: 'Offered',      value: totalOffered,      color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200' },
                { label: 'Response rate',value: `${responseRate}%`,color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
              ].map(card => (
                <div key={card.label} className={`rounded-xl border-2 ${card.bg} p-4`}>
                  <p className={`text-xs font-medium ${card.color}`}>{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
                </div>
              ))}
            </div>

            {/* Applications per week */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Applications per Week</h2>
              {data?.byWeek.length === 0 ? (
                <p className="text-sm text-gray-400">No application data yet — mark some jobs as Applied to see your weekly pace.</p>
              ) : (
                <div className="space-y-3">
                  {data?.byWeek.map(w => (
                    <div key={w.week} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-24 shrink-0">
                        {new Date(w.week).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                      </span>
                      <Bar value={w.count} max={maxWeek} color="bg-green-400" />
                      <span className="text-sm font-semibold text-gray-700 w-6 text-right">{w.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Jobs by source */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Jobs by Source</h2>
              <div className="space-y-3">
                {data?.bySource.map(s => (
                  <div key={s.source} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-28 shrink-0">
                      {SOURCE_LABELS[s.source.toLowerCase()] ?? s.source}
                    </span>
                    <Bar value={s.count} max={maxSource} color="bg-blue-400" />
                    <span className="text-sm font-semibold text-gray-700 w-10 text-right">{s.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Status Breakdown</h2>
              <div className="space-y-3">
                {data?.byStatus
                  .sort((a, b) => b.count - a.count)
                  .map(s => (
                    <div key={s.status} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-24 shrink-0 capitalize">{s.status}</span>
                      <Bar value={s.count} max={maxStatus} color={STATUS_COLORS[s.status] ?? 'bg-gray-400'} />
                      <span className="text-sm font-semibold text-gray-700 w-10 text-right">{s.count.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
