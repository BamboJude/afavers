import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  /** Keywords used to filter story bubbles and Hot Picks. Empty = no filter. */
  filterKeywords: string[];
  /** When false, all jobs are shown regardless of keywords. */
  filterEnabled: boolean;
  setFilterKeywords: (kw: string[]) => void;
  setFilterEnabled: (v: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      filterKeywords: [],
      filterEnabled: false,
      setFilterKeywords: (kw) => set({ filterKeywords: kw }),
      setFilterEnabled: (v) => set({ filterEnabled: v }),
    }),
    { name: 'afavers-preferences' }
  )
);

/** Returns true if a job matches the active filter, or if filtering is off. */
export function jobMatchesFilter(
  job: { title?: string; company?: string; description?: string | null },
  filterKeywords: string[],
  filterEnabled: boolean
): boolean {
  if (!filterEnabled || filterKeywords.length === 0) return true;
  const text = `${job.title ?? ''} ${job.company ?? ''} ${job.description ?? ''}`.toLowerCase();
  return filterKeywords.some(kw => kw.trim() && text.includes(kw.trim().toLowerCase()));
}
