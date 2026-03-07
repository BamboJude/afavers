import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CalendarEventType = 'interview' | 'followup' | 'deadline' | 'note';

export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: CalendarEventType;
  time?: string; // HH:MM
}

interface CalendarState {
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  removeEvent: (id: string) => void;
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      events: [],
      addEvent: (event) =>
        set(state => ({
          events: [...state.events, { ...event, id: crypto.randomUUID() }],
        })),
      removeEvent: (id) =>
        set(state => ({ events: state.events.filter(e => e.id !== id) })),
    }),
    { name: 'calendar-events' }
  )
);
