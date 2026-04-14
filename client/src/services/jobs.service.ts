import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Job, JobsResponse, JobFilters, DashboardStats, FollowUpAlert, AnalyticsData } from '../types';

type UserJobOverlay = Partial<Pick<Job,
  'status' | 'notes' | 'cover_letter' | 'applied_date' | 'follow_up_date' | 'interview_date' | 'is_hidden'
>> & {
  job_id: number;
  updated_at?: string;
};

const TRACKED_STATUSES = ['saved', 'applied', 'interviewing', 'offered', 'rejected'];

function getUserId(): number {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) throw new Error('You need to sign in again.');
  return userId;
}

function defaultJob(job: any): Job {
  return {
    ...job,
    status: job.status ?? 'new',
    notes: job.notes ?? null,
    cover_letter: job.cover_letter ?? null,
    applied_date: job.applied_date ?? null,
    follow_up_date: job.follow_up_date ?? null,
    interview_date: job.interview_date ?? null,
    is_hidden: job.is_hidden ?? false,
  };
}

function mergeJob(job: any, overlay?: UserJobOverlay): Job {
  const base = defaultJob(job);
  if (!overlay) return base;
  return {
    ...base,
    status: (overlay.status ?? base.status) as Job['status'],
    notes: overlay.notes ?? base.notes,
    cover_letter: overlay.cover_letter ?? base.cover_letter,
    applied_date: overlay.applied_date ?? base.applied_date,
    follow_up_date: overlay.follow_up_date ?? base.follow_up_date,
    interview_date: overlay.interview_date ?? base.interview_date,
    is_hidden: overlay.is_hidden ?? base.is_hidden,
    updated_at: overlay.updated_at ?? base.updated_at,
  };
}

async function getUserOverlays(userId: number): Promise<Map<number, UserJobOverlay>> {
  const { data, error } = await supabase
    .from('user_jobs')
    .select('job_id,status,notes,cover_letter,applied_date,follow_up_date,interview_date,is_hidden,updated_at')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((row) => [row.job_id, row as UserJobOverlay]));
}

function applyFilters(jobs: Job[], filters?: JobFilters): Job[] {
  let rows = jobs.filter((job) => !job.is_hidden);

  if (filters?.status) {
    rows = rows.filter((job) => job.status === filters.status);
  }
  if (filters?.source) {
    rows = rows.filter((job) => job.source === filters.source);
  }
  if (filters?.language) {
    rows = rows.filter((job) => job.language === filters.language);
  }
  if (filters?.remoteOnly) {
    rows = rows.filter((job) => `${job.location} ${job.title} ${job.description}`.toLowerCase().includes('remote'));
  }
  if (filters?.studentOnly) {
    rows = rows.filter((job) => {
      const text = `${job.title} ${job.company} ${job.description}`.toLowerCase();
      return text.includes('werkstudent') ||
        text.includes('working student') ||
        text.includes('studentische') ||
        text.includes('student assistant') ||
        text.includes('praktikum') ||
        text.includes('internship');
    });
  }
  if (filters?.location) {
    const locations = filters.location.split('|').map((value) => value.trim().toLowerCase()).filter(Boolean);
    rows = rows.filter((job) => locations.some((location) => job.location?.toLowerCase().includes(location)));
  }
  if (filters?.dateFrom) {
    const from = new Date(filters.dateFrom).getTime();
    rows = rows.filter((job) => job.posted_date ? new Date(job.posted_date).getTime() >= from : false);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter((job) =>
      [job.title, job.company, job.location, job.description, job.source]
        .some((value) => value?.toLowerCase().includes(q))
    );
  }

  const sortBy = filters?.sortBy || 'created_at';
  const sortOrder = filters?.sortOrder || 'DESC';
  rows.sort((a, b) => {
    const av = (a as any)[sortBy] ?? '';
    const bv = (b as any)[sortBy] ?? '';
    const result = String(av).localeCompare(String(bv));
    return sortOrder === 'ASC' ? result : -result;
  });

  return rows;
}

async function getMergedJobs(): Promise<Job[]> {
  const userId = getUserId();
  const [{ data: jobs, error }, overlays] = await Promise.all([
    supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(1000),
    getUserOverlays(userId),
  ]);

  if (error) throw new Error(error.message);
  return (jobs ?? []).map((job) => mergeJob(job, overlays.get(job.id)));
}

async function upsertOverlay(id: number, values: Partial<UserJobOverlay>): Promise<Job> {
  const userId = getUserId();
  const { error } = await supabase
    .from('user_jobs')
    .upsert({
      user_id: userId,
      job_id: id,
      ...values,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,job_id' });

  if (error) throw new Error(error.message);
  return jobsService.getJob(id);
}

export const jobsService = {
  async getStats(): Promise<DashboardStats> {
    const jobs = await getMergedJobs();
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: jobs.filter((job) => !job.is_hidden).length,
      new: jobs.filter((job) => job.status === 'new').length,
      saved: jobs.filter((job) => job.status === 'saved').length,
      applied: jobs.filter((job) => job.status === 'applied').length,
      interviewing: jobs.filter((job) => job.status === 'interviewing').length,
      offered: jobs.filter((job) => job.status === 'offered').length,
      rejected: jobs.filter((job) => job.status === 'rejected').length,
      new_today: jobs.filter((job) => job.created_at?.slice(0, 10) === today).length,
      applied_today: jobs.filter((job) => job.applied_date?.slice(0, 10) === today).length,
    };
  },

  async getJobs(filters?: JobFilters): Promise<JobsResponse> {
    const filtered = applyFilters(await getMergedJobs(), filters);
    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? 50;
    const jobs = filtered.slice(offset, offset + limit);
    return {
      jobs,
      total: filtered.length,
      page: Math.floor(offset / limit) + 1,
      limit,
    };
  },

  async getJob(id: number): Promise<Job> {
    const userId = getUserId();
    const [{ data: job, error }, overlays] = await Promise.all([
      supabase.from('jobs').select('*').eq('id', id).single(),
      getUserOverlays(userId),
    ]);

    if (error) throw new Error(error.message);
    return mergeJob(job, overlays.get(id));
  },

  async updateStatus(
    id: number,
    status: Job['status'],
    appliedDate?: string,
    followUpDate?: string
  ): Promise<Job> {
    return upsertOverlay(id, {
      status,
      applied_date: status === 'applied' ? (appliedDate ?? new Date().toISOString().slice(0, 10)) : appliedDate,
      follow_up_date: followUpDate,
    });
  },

  async updateNotes(id: number, notes: string): Promise<Job> {
    return upsertOverlay(id, { notes });
  },

  async toggleHidden(id: number, isHidden: boolean): Promise<Job> {
    return upsertOverlay(id, { is_hidden: isHidden });
  },

  async deleteJob(id: number): Promise<void> {
    const userId = getUserId();
    const { error } = await supabase
      .from('user_jobs')
      .delete()
      .eq('user_id', userId)
      .eq('job_id', id);
    if (error) throw new Error(error.message);
  },

  async fetchJobs(): Promise<{ success: boolean; message: string; inserted: number }> {
    return {
      success: false,
      message: 'Manual job fetching will move to a Supabase Edge Function.',
      inserted: 0,
    };
  },

  async updateCoverLetter(id: number, coverLetter: string): Promise<Job> {
    return upsertOverlay(id, { cover_letter: coverLetter });
  },

  async updateInterviewDate(id: number, interviewDate: string | null): Promise<Job> {
    return upsertOverlay(id, { interview_date: interviewDate ?? undefined });
  },

  async getFollowUps(): Promise<FollowUpAlert[]> {
    const today = new Date().toISOString().slice(0, 10);
    return (await getMergedJobs())
      .filter((job) => job.follow_up_date && job.follow_up_date <= today && TRACKED_STATUSES.includes(job.status))
      .map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        follow_up_date: job.follow_up_date!,
        status: job.status,
      }));
  },

  async getAnalytics(): Promise<AnalyticsData> {
    const jobs = (await getMergedJobs()).filter((job) => TRACKED_STATUSES.includes(job.status));
    const countBy = (key: keyof Job) => Object.entries(jobs.reduce<Record<string, number>>((acc, job) => {
      const value = String(job[key] ?? 'Unknown');
      acc[value] = (acc[value] ?? 0) + 1;
      return acc;
    }, {}));

    return {
      bySource: countBy('source').map(([source, count]) => ({ source, count })),
      byStatus: countBy('status').map(([status, count]) => ({ status, count })),
      byLocation: countBy('location').map(([location, count]) => ({ location, count })),
      byWeek: Object.entries(jobs.reduce<Record<string, number>>((acc, job) => {
        const date = job.applied_date ?? job.created_at;
        const week = date ? date.slice(0, 10) : 'Unknown';
        acc[week] = (acc[week] ?? 0) + 1;
        return acc;
      }, {})).map(([week, count]) => ({ week, count })),
    };
  },

  async exportCsv(): Promise<void> {
    const jobs = (await getMergedJobs()).filter((job) => TRACKED_STATUSES.includes(job.status));
    const escape = (value: unknown) => {
      if (value == null) return '';
      const text = String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const headers = ['Title','Company','Location','Source','Status','Applied Date','URL','Posted Date','Salary','Deadline'];
    const csv = [
      headers.join(','),
      ...jobs.map((job) => [
        job.title, job.company, job.location, job.source, job.status,
        job.applied_date, job.url, job.posted_date, job.salary, job.deadline,
      ].map(escape).join(',')),
    ].join('\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'afavers-applications.csv';
    a.click();
    URL.revokeObjectURL(url);
  },
};
