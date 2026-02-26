import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsService } from '../services/jobs.service';
import type { Job } from '../types';
import { useLanguage } from '../store/languageStore';

const COLUMNS: { status: Job['status']; labelKey: string; color: string; bg: string; headerBg: string }[] = [
  { status: 'saved',        labelKey: 'saved',        color: 'text-yellow-700', bg: 'bg-yellow-50/70',  headerBg: 'bg-yellow-50  border-yellow-200' },
  { status: 'applied',      labelKey: 'applied',      color: 'text-green-700',  bg: 'bg-green-50/70',   headerBg: 'bg-green-50   border-green-200' },
  { status: 'interviewing', labelKey: 'interviewing', color: 'text-purple-700', bg: 'bg-purple-50/70',  headerBg: 'bg-purple-50  border-purple-200' },
  { status: 'offered',      labelKey: 'offered',      color: 'text-emerald-700',bg: 'bg-emerald-50/70', headerBg: 'bg-emerald-50 border-emerald-200' },
  { status: 'rejected',     labelKey: 'rejected',     color: 'text-red-700',    bg: 'bg-red-50/70',     headerBg: 'bg-red-50     border-red-200' },
];

/** Shared card content rendered in both mobile and desktop views */
const KanbanCard = ({ job, onClick, draggable, onDragStart, onDragEnd, faded, t }: {
  job: Job;
  onClick: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  faded?: boolean;
  t: (key: string) => string;
}) => (
  <div
    draggable={draggable}
    onDragStart={onDragStart}
    onDragEnd={onDragEnd}
    onClick={onClick}
    className={`bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow select-none cursor-pointer ${
      draggable ? 'cursor-grab active:cursor-grabbing' : ''
    } ${faded ? 'opacity-50 scale-95' : ''}`}
  >
    <h3 className="font-medium text-gray-900 text-sm mb-1 hover:text-blue-600 line-clamp-2 leading-snug">
      {job.title}
    </h3>
    <p className="text-xs font-medium text-gray-600 mb-1">{job.company}</p>
    <p className="text-xs text-gray-400">📍 {job.location}</p>
    {job.notes && (
      <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100 line-clamp-2 italic">
        "{job.notes}"
      </p>
    )}
    {job.applied_date && (
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <p className="text-xs text-green-600 font-medium">
          ✓ {new Date(job.applied_date).toLocaleDateString('de-DE')}
        </p>
        {(job.status === 'applied' || job.status === 'interviewing') && (() => {
          const days = Math.floor((Date.now() - new Date(job.applied_date!).getTime()) / 86400000);
          return days > 0 ? (
            <span className="text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5">
              {days}{t('daysWaiting')}
            </span>
          ) : null;
        })()}
      </div>
    )}
    {job.interview_date && (
      <p className="text-xs text-purple-600 mt-1 font-medium">
        📞 {new Date(job.interview_date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
      </p>
    )}
  </div>
);

export const KanbanPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<Job | null>(null);
  const [dragOver, setDragOver] = useState<Job['status'] | null>(null);
  const [mobileTab, setMobileTab] = useState<Job['status']>('saved');

  useEffect(() => {
    fetchTrackedJobs();
  }, []);

  const fetchTrackedJobs = async () => {
    try {
      setLoading(true);
      const statuses = ['saved', 'applied', 'interviewing', 'offered', 'rejected'];
      const results = await Promise.all(
        statuses.map(status => jobsService.getJobs({ status, limit: 100 }))
      );
      setJobs(results.flatMap(r => r.jobs));
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getJobsForStatus = (status: Job['status']) =>
    jobs.filter(j => j.status === status);

  const handleDrop = async (newStatus: Job['status']) => {
    setDragOver(null);
    if (!dragging || dragging.status === newStatus) {
      setDragging(null);
      return;
    }
    try {
      const today = new Date().toISOString().split('T')[0];
      const appliedDate = newStatus === 'applied' && !dragging.applied_date ? today : undefined;
      setJobs(prev => prev.map(j => j.id === dragging.id ? {
        ...j, status: newStatus,
        ...(appliedDate ? { applied_date: appliedDate } : {}),
      } : j));
      await jobsService.updateStatus(dragging.id, newStatus, appliedDate);
    } catch {
      fetchTrackedJobs();
    } finally {
      setDragging(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('kanban')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{jobs.length} {t('jobsTracked')}</p>
          </div>
          <button
            onClick={() => navigate('/jobs')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition"
          >
            + {t('trackNewJobs')}
          </button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-24 px-6">
          <div className="text-5xl mb-4">🗂️</div>
          <p className="text-gray-500 text-lg font-medium mb-1">{t('noJobsTracked')}</p>
          <p className="text-gray-400 text-sm mb-6">{t('noJobsTrackedHint')}</p>
          <button
            onClick={() => navigate('/jobs')}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition"
          >
            {t('browseJobs2')}
          </button>
        </div>
      ) : (
        <>
          {/* ── Mobile view: tabs + vertical list ── */}
          <div className="block lg:hidden">
            {/* Status tab bar */}
            <div className="flex bg-white border-b border-gray-200 sticky top-0 z-10">
              {COLUMNS.map(col => {
                const count = getJobsForStatus(col.status).length;
                const isActive = mobileTab === col.status;
                return (
                  <button
                    key={col.status}
                    onClick={() => setMobileTab(col.status)}
                    className={`flex-1 py-3 px-1 text-xs font-medium border-b-2 transition-colors ${
                      isActive
                        ? `${col.color} border-current`
                        : 'text-gray-400 border-transparent'
                    }`}
                  >
                    <span className="block truncate">{t(col.labelKey)}</span>
                    <span className={`inline-block rounded-full px-1.5 text-xs font-bold mt-0.5 ${
                      isActive ? 'bg-white/70' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Card list for active tab */}
            <div className="p-3 space-y-2.5">
              {getJobsForStatus(mobileTab).length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-sm font-medium">{t('noJobsTracked')}</p>
                  <button
                    onClick={() => navigate('/jobs')}
                    className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium transition"
                  >
                    {t('browseJobs2')}
                  </button>
                </div>
              ) : (
                getJobsForStatus(mobileTab).map(job => (
                  <KanbanCard
                    key={job.id}
                    job={job}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    t={t}
                  />
                ))
              )}
            </div>
          </div>

          {/* ── Desktop view: drag-and-drop columns ── */}
          <div className="hidden lg:block p-6 overflow-x-auto">
            <div className="flex gap-4 min-w-max">
              {COLUMNS.map(col => {
                const colJobs = getJobsForStatus(col.status);
                const isTarget = dragOver === col.status && dragging?.status !== col.status;
                return (
                  <div
                    key={col.status}
                    className={`w-72 flex-shrink-0 rounded-2xl border-2 flex flex-col transition-all duration-150 ${
                      isTarget
                        ? 'border-blue-400 bg-blue-50/50 shadow-md scale-[1.01]'
                        : 'border-gray-200 bg-white'
                    }`}
                    onDragOver={e => { e.preventDefault(); setDragOver(col.status); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={() => handleDrop(col.status)}
                  >
                    {/* Column header */}
                    <div className={`px-4 py-3 border-b rounded-t-2xl ${col.headerBg}`}>
                      <div className="flex justify-between items-center">
                        <h2 className={`font-semibold text-sm ${col.color}`}>{t(col.labelKey)}</h2>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/80 ${col.color}`}>
                          {colJobs.length}
                        </span>
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="p-3 space-y-2.5 min-h-36 flex-1">
                      {colJobs.length === 0 ? (
                        <div className={`text-center py-8 text-sm rounded-xl border-2 border-dashed transition-colors ${
                          isTarget ? 'border-blue-300 text-blue-400' : 'border-gray-200 text-gray-300'
                        }`}>
                          {dragging ? '↓ Drop here' : 'No jobs'}
                        </div>
                      ) : (
                        colJobs.map(job => (
                          <KanbanCard
                            key={job.id}
                            job={job}
                            onClick={() => navigate(`/jobs/${job.id}`)}
                            draggable
                            onDragStart={() => setDragging(job)}
                            onDragEnd={() => { setDragging(null); setDragOver(null); }}
                            faded={dragging?.id === job.id}
                            t={t}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-gray-400 mt-4 text-center">
              Drag cards between columns to update their status
            </p>
          </div>
        </>
      )}
    </div>
  );
};
