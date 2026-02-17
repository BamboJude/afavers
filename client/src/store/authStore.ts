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
  isMockMode: boolean;
  login: (email: string, password: string, useMock?: boolean) => Promise<void>;
  logout: () => void;
  setAuth: (user: User, token: string) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Mock login - bypasses backend
const mockLogin = (email: string, password: string) => {
  // Simulate API delay
  return new Promise<{ user: User; token: string }>((resolve, reject) => {
    setTimeout(() => {
      // Accept any credentials in mock mode
      if (email && password) {
        resolve({
          user: { id: 1, email },
          token: 'mock-jwt-token-' + Date.now(),
        });
      } else {
        reject(new Error('Email and password required'));
      }
    }, 500);
  });
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isMockMode: false,

      login: async (email: string, password: string, useMock = false) => {
        if (useMock) {
          // Mock mode - no backend required
          const data = await mockLogin(email, password);
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isMockMode: true,
          });
          return;
        }

        // Real mode - connect to backend
        try {
          const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
          }

          const data = await response.json();
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isMockMode: false,
          });
        } catch (error) {
          // If backend is down, suggest mock mode
          if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Backend is not running. Try Mock Mode instead!');
          }
          throw error;
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, isMockMode: false });
      },

      setAuth: (user: User, token: string) => {
        set({ user, token, isAuthenticated: true, isMockMode: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
