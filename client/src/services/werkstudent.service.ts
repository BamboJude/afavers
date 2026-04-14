import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export interface WerkstudentJob {
  refnr: string;
  title: string;
  company: string;
  location: string;
  postedDate?: string;
  url: string;
}

export interface SearchResult {
  jobs: WerkstudentJob[];
  total: number;
  searchTerm: string;
  locations: string[];
  userKeywords: string[];
}

export type WerkstudentStatus = 'saved' | 'applied' | null;

function getUserId(): number {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) throw new Error('You need to sign in again.');
  return userId;
}

export const werkstudentService = {
  async search(keyword: string, location: string): Promise<SearchResult> {
    const { data, error } = await supabase.functions.invoke<SearchResult>('werkstudent-search', {
      body: { keyword, location },
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Search failed');
    return data;
  },

  async getSavedMap(): Promise<Record<string, Exclude<WerkstudentStatus, null>>> {
    const userId = getUserId();
    const { data, error } = await supabase
      .from('werkstudent_saved')
      .select('refnr,status')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return Object.fromEntries((data ?? []).map((row) => [row.refnr, row.status]));
  },

  async save(job: WerkstudentJob, status: Exclude<WerkstudentStatus, null>): Promise<void> {
    const userId = getUserId();
    const { error } = await supabase
      .from('werkstudent_saved')
      .upsert({
        user_id: userId,
        refnr: job.refnr,
        title: job.title,
        company: job.company,
        location: job.location || '',
        url: job.url,
        posted_date: job.postedDate ?? null,
        status,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,refnr' });

    if (error) throw new Error(error.message);
  },

  async remove(refnr: string): Promise<void> {
    const userId = getUserId();
    const { error } = await supabase
      .from('werkstudent_saved')
      .delete()
      .eq('user_id', userId)
      .eq('refnr', refnr);

    if (error) throw new Error(error.message);
  },
};
