export interface User {
  id: number;
  email: string;
}

export interface Job {
  id: number;
  external_id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: string;
  posted_date: string | null;
  deadline: string | null;
  salary: string | null;
  status: 'new' | 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected';
  notes: string | null;
  applied_date: string | null;
  follow_up_date: string | null;
  is_hidden: boolean;
  language: 'en' | 'de' | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total: number;
  new: number;
  saved: number;
  applied: number;
  interviewing: number;
  offered: number;
  rejected: number;
  new_today: number;
}

export interface JobsResponse {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
}

export interface JobFilters {
  status?: string;
  source?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
  language?: 'en' | 'de';
  noFilter?: boolean;
}
