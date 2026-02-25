// User types
export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: Date;
}

export interface UserResponse {
  id: number;
  email: string;
}

// Job types
export interface Job {
  id: number;
  external_id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: string;
  posted_date: Date | null;
  deadline: Date | null;
  salary: string | null;
  status: JobStatus;
  notes: string | null;
  cover_letter: string | null;
  applied_date: Date | null;
  follow_up_date: Date | null;
  interview_date: Date | null;
  is_hidden: boolean;
  language: 'en' | 'de' | null;
  created_at: Date;
  updated_at: Date;
}

export type JobStatus =
  | 'new'
  | 'saved'
  | 'applied'
  | 'interviewing'
  | 'offered'
  | 'rejected';

export interface JobFilters {
  status?: string;
  source?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
  userKeywords?: string[];   // Filter jobs to match user's search keywords
  userLocations?: string[];  // Filter jobs to match user's target locations
  language?: 'en' | 'de';   // Filter by detected language
  noFilter?: boolean;        // Bypass user keyword/location filters — show all jobs
  dateFrom?: string;         // ISO date string — only show jobs posted on/after this date
}

// External job fetcher types
export interface ExternalJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  postedDate?: string;
  deadline?: string;
  salary?: string;
}

// Activity log types
export interface ActivityLog {
  id: number;
  job_id: number;
  action: string;
  created_at: Date;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
