import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export type JobAlertFrequency = 'instant' | 'daily';

export interface JobAlert {
  id?: number;
  user_id?: number;
  name: string;
  keywords: string;
  locations: string;
  min_score: number;
  frequency: JobAlertFrequency;
  enabled: boolean;
  last_sent_at?: string | null;
}

export const DEFAULT_JOB_ALERT: JobAlert = {
  name: 'Priority job alert',
  keywords: 'werkstudent, IT, GIS, data analyst, data analysis',
  locations: 'NRW, Düsseldorf, Köln, Essen, Dortmund, Bochum',
  min_score: 70,
  frequency: 'instant',
  enabled: false,
  last_sent_at: null,
};

function getUserId(): number {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) throw new Error('You need to sign in again.');
  return userId;
}

export const jobAlertsService = {
  async getPrimary(): Promise<JobAlert> {
    const userId = getUserId();
    const { data, error } = await supabase
      .from('job_alerts')
      .select('id,user_id,name,keywords,locations,min_score,frequency,enabled,last_sent_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (/job_alerts|schema cache|relation/i.test(error.message)) return DEFAULT_JOB_ALERT;
      throw new Error(error.message);
    }
    return data ?? DEFAULT_JOB_ALERT;
  },

  async save(alert: JobAlert): Promise<JobAlert> {
    const userId = getUserId();
    const row = {
      id: alert.id,
      user_id: userId,
      name: alert.name || DEFAULT_JOB_ALERT.name,
      keywords: alert.keywords,
      locations: alert.locations,
      min_score: alert.min_score,
      frequency: alert.frequency,
      enabled: alert.enabled,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('job_alerts')
      .upsert(row, { onConflict: 'id' })
      .select('id,user_id,name,keywords,locations,min_score,frequency,enabled,last_sent_at')
      .single();

    if (error) throw new Error(error.message);
    return data;
  },
};
