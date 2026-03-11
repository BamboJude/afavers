import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ReminderType = 'interview' | 'followup' | 'deadline' | 'custom';

export interface Reminder {
  id: string;
  title: string;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM
  type: ReminderType;
  completed: boolean;
  linkedJobId?: number;
  notes?: string;
}

interface ReminderState {
  reminders: Reminder[];
  addReminder: (r: Omit<Reminder, 'id' | 'completed'>) => string;
  toggleComplete: (id: string) => void;
  removeReminder: (id: string) => void;
  updateReminder: (id: string, changes: Partial<Omit<Reminder, 'id'>>) => void;
}

export const useReminderStore = create<ReminderState>()(
  persist(
    (set) => ({
      reminders: [],

      addReminder: (r) => {
        const id = crypto.randomUUID();
        set(state => ({
          reminders: [...state.reminders, { ...r, id, completed: false }],
        }));
        return id;
      },

      toggleComplete: (id) =>
        set(state => ({
          reminders: state.reminders.map(r =>
            r.id === id ? { ...r, completed: !r.completed } : r
          ),
        })),

      removeReminder: (id) =>
        set(state => ({ reminders: state.reminders.filter(r => r.id !== id) })),

      updateReminder: (id, changes) =>
        set(state => ({
          reminders: state.reminders.map(r => r.id === id ? { ...r, ...changes } : r),
        })),
    }),
    { name: 'afavers-reminders' }
  )
);
