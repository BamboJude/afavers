import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isDemo: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function authRequest(path: string, email: string, password: string) {
  const response = await fetch(`${API_URL}/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || `${path} failed`);
  }

  return response.json();
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isDemo: false,

      login: async (email, password) => {
        const data = await authRequest('login', email, password);
        set({ user: data.user, token: data.token, isAuthenticated: true, isDemo: false });
      },

      loginDemo: async () => {
        const response = await fetch(`${API_URL}/api/auth/demo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Demo login failed');
        }
        const data = await response.json();
        set({ user: data.user, token: data.token, isAuthenticated: true, isDemo: true });
      },

      register: async (email, password) => {
        await authRequest('register', email, password);
        const data = await authRequest('login', email, password);
        set({ user: data.user, token: data.token, isAuthenticated: true, isDemo: false });
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, isDemo: false });
      },
    }),
    { name: 'auth-storage' }
  )
);
