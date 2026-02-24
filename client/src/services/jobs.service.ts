import { api } from './api';
import type { Job, JobsResponse, JobFilters, DashboardStats, FollowUpAlert, AnalyticsData } from '../types';

export const jobsService = {
  // Get dashboard stats
  async getStats(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/jobs/stats');
    return response.data;
  },

  // Get all jobs with filters
  async getJobs(filters?: JobFilters): Promise<JobsResponse> {
    const response = await api.get<JobsResponse>('/jobs', { params: filters });
    return response.data;
  },

  // Get single job
  async getJob(id: number): Promise<Job> {
    const response = await api.get<Job>(`/jobs/${id}`);
    return response.data;
  },

  // Update job status
  async updateStatus(
    id: number,
    status: Job['status'],
    appliedDate?: string,
    followUpDate?: string
  ): Promise<Job> {
    const response = await api.patch<{ job: Job }>(`/jobs/${id}/status`, {
      status,
      appliedDate,
      followUpDate,
    });
    return response.data.job;
  },

  // Update job notes
  async updateNotes(id: number, notes: string): Promise<Job> {
    const response = await api.patch<{ job: Job }>(`/jobs/${id}/notes`, {
      notes,
    });
    return response.data.job;
  },

  // Hide/show job
  async toggleHidden(id: number, isHidden: boolean): Promise<Job> {
    const response = await api.patch<{ job: Job }>(`/jobs/${id}/hide`, {
      isHidden,
    });
    return response.data.job;
  },

  // Delete job
  async deleteJob(id: number): Promise<void> {
    await api.delete(`/jobs/${id}`);
  },

  // Trigger manual job fetch
  async fetchJobs(): Promise<any> {
    const response = await api.post('/jobs/fetch');
    return response.data;
  },

  // Update cover letter
  async updateCoverLetter(id: number, coverLetter: string): Promise<Job> {
    const response = await api.patch<{ job: Job }>(`/jobs/${id}/cover-letter`, { coverLetter });
    return response.data.job;
  },

  // Update interview date
  async updateInterviewDate(id: number, interviewDate: string | null): Promise<Job> {
    const response = await api.patch<{ job: Job }>(`/jobs/${id}/interview-date`, { interviewDate });
    return response.data.job;
  },

  // Get follow-up alerts (overdue/today)
  async getFollowUps(): Promise<FollowUpAlert[]> {
    const response = await api.get<FollowUpAlert[]>('/jobs/follow-ups');
    return response.data;
  },

  // Get analytics data
  async getAnalytics(): Promise<AnalyticsData> {
    const response = await api.get<AnalyticsData>('/jobs/analytics');
    return response.data;
  },
};
