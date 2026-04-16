import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface User {
  id: number;
  email: string;
  isAdmin?: boolean;
}

interface SupabaseAuthUser {
  id: string;
  email?: string;
}

const DEMO_EMAIL = 'demo@afavers.com';
const DEMO_PASSWORD = 'demo1234';
const DEMO_STATUSES: Array<'applied' | 'preparing' | 'saved' | 'followup' | 'interviewing' | 'offered' | 'rejected'> = [
  'applied',
  'applied',
  'preparing',
  'preparing',
  'saved',
  'saved',
  'followup',
  'interviewing',
  'interviewing',
  'offered',
  'rejected',
  'saved',
];

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isDemo: boolean;
  lastActivity: number | null;
  login: (email: string, password: string, adminKey?: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateActivity: () => void;
}

function isDemoEmail(email?: string | null): boolean {
  return email?.toLowerCase() === DEMO_EMAIL;
}

async function getCurrentAppUser(authUser?: SupabaseAuthUser): Promise<User> {
  let currentAuthUser = authUser;
  if (!currentAuthUser) {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw new Error(authError.message);
    currentAuthUser = authData.user ?? undefined;
  }

  if (!currentAuthUser?.email) throw new Error('No active Supabase session');

  let { data, error } = await supabase
    .from('users')
    .select('id,email,is_admin')
    .eq('auth_user_id', currentAuthUser.id)
    .maybeSingle();

  if (error && !/auth_user_id/i.test(error.message)) throw new Error(error.message);
  if (!data) {
    const fallback = await supabase
      .from('users')
      .select('id,email,is_admin')
      .ilike('email', currentAuthUser.email)
      .maybeSingle();
    if (fallback.error) throw new Error(fallback.error.message);
    data = fallback.data;
  }

  if (!data) {
    throw new Error('Your Supabase account is not linked to an app profile yet. Run the Supabase Auth/RLS migration, then try again.');
  }

  return {
    id: data.id,
    email: data.email,
    isAdmin: Boolean(data.is_admin),
  };
}

async function resetDemoData(userId: number): Promise<void> {
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id,title,company')
    .eq('is_manual', false)
    .order('created_at', { ascending: false })
    .limit(DEMO_STATUSES.length + 4);

  if (jobsError) throw new Error(jobsError.message);
  const picks = (jobs ?? []).slice(0, DEMO_STATUSES.length);
  if (picks.length === 0) return;

  const { error: deleteError } = await supabase
    .from('user_jobs')
    .delete()
    .eq('user_id', userId);
  if (deleteError) throw new Error(deleteError.message);

  const today = new Date();
  const rows = picks.map((job, index) => {
    const status = DEMO_STATUSES[index];
    const appliedDate = ['applied', 'followup', 'interviewing', 'offered', 'rejected'].includes(status)
      ? new Date(today.getTime() - (index + 2) * 86400000).toISOString().slice(0, 10)
      : null;
    const followUpDate = status === 'followup'
      ? today.toISOString().slice(0, 10)
      : status === 'applied'
        ? new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10)
        : null;
    const interviewDate = status === 'interviewing'
      ? new Date(today.getTime() + (index + 1) * 86400000).toISOString().slice(0, 10)
      : null;

    return {
      user_id: userId,
      job_id: job.id,
      status,
      applied_date: appliedDate,
      follow_up_date: followUpDate,
      interview_date: interviewDate,
      checklist: status === 'preparing'
        ? { 'CV tailored': true, 'Cover letter ready': index % 2 === 0 }
        : status === 'applied' || status === 'followup' || status === 'interviewing'
          ? { 'CV tailored': true, 'Cover letter ready': true, 'Application submitted': true }
          : {},
      notes: status === 'followup' ? 'Demo note: send a polite follow-up today.' : null,
      history: [
        { type: 'manual', label: 'Added to demo tracker', at: new Date(today.getTime() - (index + 4) * 86400000).toISOString() },
        { type: 'status', label: `Moved to ${status}`, at: new Date(today.getTime() - (index + 1) * 86400000).toISOString() },
      ],
      updated_at: new Date().toISOString(),
    };
  });

  const { error: insertError } = await supabase
    .from('user_jobs')
    .insert(rows);
  if (insertError) throw new Error(insertError.message);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isDemo: false,
      lastActivity: null,

      login: async (email, password, _adminKey?) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password,
        });
        if (error) throw new Error(error.message);
        if (!data.session) throw new Error('Please confirm your email before signing in.');

        const user = await getCurrentAppUser(data.user ?? undefined);
        set({
          user,
          token: data.session.access_token,
          isAuthenticated: true,
          isDemo: false,
          lastActivity: Date.now(),
        });
      },

      loginDemo: async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        });
        if (error) throw new Error(error.message);
        if (!data.session) throw new Error('Demo account unavailable.');

        const user = await getCurrentAppUser(data.user ?? undefined);
        await resetDemoData(user.id);
        set({
          user,
          token: data.session.access_token,
          isAuthenticated: true,
          isDemo: true,
          lastActivity: Date.now(),
        });
      },

      register: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
        });
        if (error) throw new Error(error.message);
        if (!data.session) return;

        const user = await getCurrentAppUser(data.user ?? undefined);
        set({
          user,
          token: data.session.access_token,
          isAuthenticated: true,
          isDemo: false,
          lastActivity: Date.now(),
        });
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, token: null, isAuthenticated: false, isDemo: false, lastActivity: null });
      },

      updateActivity: () => {
        set({ lastActivity: Date.now() });
      },
    }),
    { name: 'auth-storage' }
  )
);

supabase.auth.getSession().then(async ({ data }) => {
  if (!data.session) return;
  try {
    const user = await getCurrentAppUser(data.session.user);
    useAuthStore.setState({
      user,
      token: data.session.access_token,
      isAuthenticated: true,
      isDemo: isDemoEmail(user.email),
      lastActivity: Date.now(),
    });
  } catch {
    await supabase.auth.signOut();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false, isDemo: false, lastActivity: null });
  }
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (!session) {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false, isDemo: false, lastActivity: null });
    return;
  }

  useAuthStore.setState({ token: session.access_token });
  setTimeout(async () => {
    try {
      const user = await getCurrentAppUser(session.user);
      useAuthStore.setState({
        user,
        token: session.access_token,
        isAuthenticated: true,
        isDemo: isDemoEmail(user.email),
        lastActivity: Date.now(),
      });
    } catch {
      useAuthStore.setState({ token: session.access_token, isAuthenticated: false });
    }
  }, 0);
});
