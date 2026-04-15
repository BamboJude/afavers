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

async function getCurrentAppUser(isAdmin = false, authUser?: SupabaseAuthUser): Promise<User> {
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
    isAdmin: isAdmin && Boolean(data.is_admin),
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isDemo: false,
      lastActivity: null,

      login: async (email, password, adminKey?) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password,
        });
        if (error) throw new Error(error.message);
        if (!data.session) throw new Error('Please confirm your email before signing in.');

        const user = await getCurrentAppUser(Boolean(adminKey), data.user ?? undefined);
        set({
          user,
          token: data.session.access_token,
          isAuthenticated: true,
          isDemo: false,
          lastActivity: Date.now(),
        });
      },

      loginDemo: async () => {
        throw new Error('Demo mode is temporarily unavailable while the backend moves to Supabase.');
      },

      register: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
        });
        if (error) throw new Error(error.message);
        if (!data.session) return;

        const user = await getCurrentAppUser(false, data.user ?? undefined);
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
    const user = await getCurrentAppUser(false, data.session.user);
    useAuthStore.setState({
      user,
      token: data.session.access_token,
      isAuthenticated: true,
      isDemo: false,
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
      const user = await getCurrentAppUser(false, session.user);
      useAuthStore.setState({
        user,
        token: session.access_token,
        isAuthenticated: true,
        isDemo: false,
        lastActivity: Date.now(),
      });
    } catch {
      useAuthStore.setState({ token: session.access_token, isAuthenticated: false });
    }
  }, 0);
});
