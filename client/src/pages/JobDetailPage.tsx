import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jobsService } from '../services/jobs.service';
import type { Job } from '../types';
import { LanguageToggle } from '../components/common/LanguageToggle';

const STATUS_OPTIONS: { value: Job['status']; label: string; color: string }[] = [
  { value: 'new',          label: 'New',          color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'saved',        label: '⭐ Saved',      color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'applied',      label: '✅ Applied',    color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'interviewing', label: '📞 Interview',  color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'offered',      label: '🎉 Offered',    color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'rejected',     label: '❌ Rejected',   color: 'bg-red-100 text-red-600 border-red-300' },
];

const isHtml = (str: string) => /<[a-z][\s\S]*>/i.test(str);

export const JobDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [savingCoverLetter, setSavingCoverLetter] = useState(false);
  const [coverLetterSaved, setCoverLetterSaved] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');
  const [savingInterviewDate, setSavingInterviewDate] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    if (id) fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      setLoading(true);
      const data = await jobsService.getJob(Number(id));
      setJob(data);
      setNotes(data.notes || '');
      setCoverLetter(data.cover_letter || '');
      setInterviewDate(data.interview_date ? data.interview_date.slice(0, 10) : '');
    } catch (error) {
      console.error('Failed to fetch job:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: Job['status']) => {
    if (!job) return;
    try {
      setUpdatingStatus(true);
      const updated = await jobsService.updateStatus(job.id, newStatus);
      setJob(updated);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!job) return;
    try {
      setSavingNotes(true);
      const updated = await jobsService.updateNotes(job.id, notes);
      setJob(updated);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveCoverLetter = async () => {
    if (!job) return;
    setSavingCoverLetter(true);
    try {
      const updated = await jobsService.updateCoverLetter(job.id, coverLetter);
      setJob(updated);
      setCoverLetterSaved(true);
      setTimeout(() => setCoverLetterSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save cover letter:', error);
    } finally {
      setSavingCoverLetter(false);
    }
  };

  const handleSaveInterviewDate = async (date: string) => {
    if (!job) return;
    setSavingInterviewDate(true);
    try {
      const updated = await jobsService.updateInterviewDate(job.id, date || null);
      setJob(updated);
      setInterviewDate(date);
    } catch (error) {
      console.error('Failed to save interview date:', error);
    } finally {
      setSavingInterviewDate(false);
    }
  };

  const handleHide = async () => {
    if (!job) return;
    await jobsService.toggleHidden(job.id, !job.is_hidden);
    navigate('/jobs');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Job not found</p>
          <button onClick={() => navigate('/jobs')} className="mt-4 text-blue-600 hover:underline text-sm">
            ← Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  const currentStatus = STATUS_OPTIONS.find(s => s.value === job.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate('/jobs')}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition"
            >
              ← Back to Jobs
            </button>
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
              >
                Apply on Bundesagentur →
              </a>
              <button
                onClick={handleHide}
                className="px-3 py-2 border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 text-sm rounded-lg transition"
              >
                {job.is_hidden ? 'Unhide' : 'Hide'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Job title card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-start gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">{job.title}</h1>
              <p className="text-base text-gray-600 mt-1">{job.company}</p>
              <p className="text-sm text-gray-400 mt-0.5">📍 {job.location}</p>
            </div>
            <span className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium border ${currentStatus?.color}`}>
              {currentStatus?.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100 text-sm">
            {job.posted_date && (
              <div>
                <span className="text-gray-400">Posted </span>
                <span className="font-medium text-gray-700">{new Date(job.posted_date).toLocaleDateString('de-DE')}</span>
              </div>
            )}
            {job.deadline && (
              <div>
                <span className="text-gray-400">Deadline </span>
                <span className="font-medium text-red-600">{new Date(job.deadline).toLocaleDateString('de-DE')}</span>
              </div>
            )}
            {job.salary && (
              <div>
                <span className="text-gray-400">Salary </span>
                <span className="font-medium text-green-700">{job.salary}</span>
              </div>
            )}
            {job.applied_date && (
              <div>
                <span className="text-gray-400">Applied </span>
                <span className="font-medium text-blue-700">{new Date(job.applied_date).toLocaleDateString('de-DE')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status update */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Track Status</h2>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => handleStatusChange(option.value)}
                disabled={updatingStatus || job.status === option.value}
                className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition ${
                  job.status === option.value
                    ? option.color
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                } disabled:cursor-not-allowed`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">My Notes</h2>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Contact person, interview date, things to prepare, salary expectations..."
            rows={5}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none text-sm text-gray-700 placeholder-gray-300"
          />
          <div className="flex justify-between items-center mt-2">
            <span className={`text-xs transition ${notesSaved ? 'text-green-600' : 'text-transparent'}`}>
              ✓ Saved
            </span>
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
            >
              {savingNotes ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>

        {/* Interview date */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Interview Date</h2>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={interviewDate}
              onChange={e => handleSaveInterviewDate(e.target.value)}
              disabled={savingInterviewDate}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm text-gray-700 disabled:opacity-50"
            />
            {interviewDate && (
              <span className="text-sm text-purple-700 font-medium">
                📞 {new Date(interviewDate).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            )}
            {interviewDate && (
              <button
                onClick={() => handleSaveInterviewDate('')}
                className="text-xs text-gray-400 hover:text-red-500 transition"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Cover letter */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Cover Letter Draft</h2>
          <textarea
            value={coverLetter}
            onChange={e => setCoverLetter(e.target.value)}
            placeholder="Draft your cover letter here — key points, opening line, why this role..."
            rows={8}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none text-sm text-gray-700 placeholder-gray-300"
          />
          <div className="flex justify-between items-center mt-2">
            <span className={`text-xs transition ${coverLetterSaved ? 'text-green-600' : 'text-transparent'}`}>
              ✓ Saved
            </span>
            <button
              onClick={handleSaveCoverLetter}
              disabled={savingCoverLetter}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
            >
              {savingCoverLetter ? 'Saving...' : 'Save Draft'}
            </button>
          </div>
        </div>

        {/* Job description */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Job Description</h2>
          {job.description ? (
            isHtml(job.description) ? (
              <div
                className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: job.description }}
              />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">{job.description}</p>
            )
          ) : (
            <p className="text-gray-400 text-sm">No description available.</p>
          )}
        </div>

        {/* Apply CTA at bottom */}
        <div className="flex justify-center pb-4">
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition"
          >
            Apply on Bundesagentur für Arbeit →
          </a>
        </div>
      </main>
    </div>
  );
};
