import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        applyTheme(next);
        set({ theme: next });
      },
    }),
    { name: 'afavers-theme' }
  )
);

/** Call once at app startup to restore saved theme before first paint */
export function initTheme() {
  try {
    const raw = localStorage.getItem('afavers-theme');
    if (raw) {
      const { state } = JSON.parse(raw);
      if (state?.theme === 'dark') document.documentElement.classList.add('dark');
    }
  } catch {}
}
