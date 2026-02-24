import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsService } from '../services/jobs.service';
import type { Job } from '../types';
import { useLanguage } from '../store/languageStore';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { DemoBanner } from '../components/common/DemoBanner';

const COLUMNS: { status: Job['status']; labelKey: string; color: string; bg: string }[] = [
  { status: 'saved',        labelKey: 'saved',        color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  { status: 'applied',      labelKey: 'applied',      color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
  { status: 'interviewing', labelKey: 'interviewing', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  { status: 'offered',      labelKey: 'offered',      color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200' },
  { status: 'rejected',     labelKey: 'rejected',     color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
];

export const KanbanPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<Job | null>(null);

  useEffect(() => {
    fetchTrackedJobs();
  }, []);

  const fetchTrackedJobs = async () => {
    try {
      setLoading(true);
      // Fetch all non-new jobs (ones being tracked)
      const statuses = ['saved', 'applied', 'interviewing', 'offered', 'rejected'];
      const results = await Promise.all(
        statuses.map(status => jobsService.getJobs({ status, limit: 100 }))
      );
      const allJobs = results.flatMap(r => r.jobs);
      setJobs(allJobs);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getJobsForStatus = (status: Job['status']) =>
    jobs.filter(j => j.status === status);

  const handleDragStart = (job: Job) => {
    setDragging(job);
  };

  const handleDrop = async (newStatus: Job['status']) => {
    if (!dragging || dragging.status === newStatus) {
      setDragging(null);
      return;
    }
    try {
      // Optimistically update UI
      setJobs(prev =>
        prev.map(j => j.id === dragging.id ? { ...j, status: newStatus } : j)
      );
      await jobsService.updateStatus(dragging.id, newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
      fetchTrackedJobs(); // Revert on error
    } finally {
      setDragging(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const totalTracked = jobs.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <DemoBanner />
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('kanban')}</h1>
              <p className="text-sm text-gray-500 mt-1">{totalTracked} {t('jobsTracked')}</p>
            </div>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <button
                onClick={() => navigate('/jobs')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition"
              >
                {t('trackNewJobs')}
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm font-medium rounded-lg transition"
              >
                ← {t('dashboard')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-4">Loading board...</p>
          </div>
        </div>
      ) : (
        <div className="p-6 overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            {COLUMNS.map(col => {
              const colJobs = getJobsForStatus(col.status);
              return (
                <div
                  key={col.status}
                  className={`w-72 flex-shrink-0 rounded-xl border-2 ${col.bg} ${
                    dragging && dragging.status !== col.status ? 'border-dashed opacity-90' : ''
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(col.status)}
                >
                  {/* Column Header */}
                  <div className="p-4 border-b border-current border-opacity-20">
                    <div className="flex justify-between items-center">
                      <h2 className={`font-semibold ${col.color}`}>{t(col.labelKey)}</h2>
                      <span className={`text-sm font-bold px-2 py-0.5 rounded-full bg-white ${col.color}`}>
                        {colJobs.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="p-3 space-y-3 min-h-32">
                    {colJobs.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        {dragging ? 'Drop here' : 'No jobs'}
                      </div>
                    ) : (
                      colJobs.map(job => (
                        <div
                          key={job.id}
                          draggable
                          onDragStart={() => handleDragStart(job)}
                          onDragEnd={() => setDragging(null)}
                          className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition"
                        >
                          <h3
                            className="font-medium text-gray-900 text-sm mb-1 hover:text-blue-600 cursor-pointer line-clamp-2"
                            onClick={() => navigate(`/jobs/${job.id}`)}
                          >
                            {job.title}
                          </h3>
                          <p className="text-xs text-gray-500 mb-2">{job.company}</p>
                          <p className="text-xs text-gray-400">📍 {job.location}</p>
                          {job.notes && (
                            <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100 line-clamp-2 italic">
                              "{job.notes}"
                            </p>
                          )}
                          {job.applied_date && (
                            <p className="text-xs text-green-600 mt-1">
                              Applied: {new Date(job.applied_date).toLocaleDateString('de-DE')}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalTracked === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg mb-2">{t('noJobsTracked')}</p>
              <p className="text-gray-400 text-sm mb-6">{t('noJobsTrackedHint')}</p>
              <button
                onClick={() => navigate('/jobs')}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition"
              >
                {t('browseJobs2')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
