import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export interface Mission {
  id: number;
  type: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  xp_reward: number;
  status: 'active' | 'completed' | 'expired';
  expires_at: string;
}

export interface Achievement {
  type: string;
  title: string;
  description: string;
  xp_bonus: number;
  unlocked_at: string;
}

export interface GamificationProfile {
  xp: {
    level: number;
    title: string;
    totalXp: number;
    xpToNext: number;
    progressPct: number;
    maxLevel: boolean;
  };
  streak: {
    current: number;
    best: number;
    lastDate: string | null;
  };
  stats: {
    totalApplications: number;
    totalInterviews: number;
    totalOffers: number;
    totalFollowUps: number;
    responseRate: number;
  };
  missions: Mission[];
  achievements: Achievement[];
}

interface UserJobRow {
  status: string;
  applied_date: string | null;
  follow_up_date: string | null;
  interview_date: string | null;
  created_at: string;
}

const LEVELS = [
  { min: 0, title: 'Job Scout' },
  { min: 100, title: 'Application Starter' },
  { min: 300, title: 'Pipeline Builder' },
  { min: 700, title: 'Interview Hunter' },
  { min: 1200, title: 'Offer Closer' },
  { min: 2000, title: 'Career Champion' },
  { min: 3200, title: 'Legend' },
];

function getUserId(): number {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) throw new Error('You need to sign in again.');
  return userId;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getWeekStart(): string {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return toDateKey(date);
}

function countStreak(dates: string[]): { current: number; best: number; lastDate: string | null } {
  const unique = [...new Set(dates.filter(Boolean).map((date) => date.slice(0, 10)))].sort();
  if (unique.length === 0) return { current: 0, best: 0, lastDate: null };

  let best = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i += 1) {
    const prev = new Date(unique[i - 1]).getTime();
    const curr = new Date(unique[i]).getTime();
    if ((curr - prev) / 86400000 === 1) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 1;
    }
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const lastDate = unique[unique.length - 1];
  const current = lastDate === toDateKey(today) || lastDate === toDateKey(yesterday) ? run : 0;

  return { current, best, lastDate };
}

function xpProfile(totalXp: number): GamificationProfile['xp'] {
  const currentIndex = LEVELS.findIndex((level, index) => {
    const next = LEVELS[index + 1];
    return totalXp >= level.min && (!next || totalXp < next.min);
  });
  const levelIndex = Math.max(0, currentIndex);
  const current = LEVELS[levelIndex];
  const next = LEVELS[levelIndex + 1];
  const maxLevel = !next;
  const xpToNext = next ? next.min - totalXp : 0;
  const progressPct = next
    ? Math.round(((totalXp - current.min) / (next.min - current.min)) * 100)
    : 100;

  return {
    level: levelIndex + 1,
    title: current.title,
    totalXp,
    xpToNext,
    progressPct,
    maxLevel,
  };
}

function makeAchievements(rows: UserJobRow[], streakBest: number): Achievement[] {
  const now = new Date().toISOString();
  const applications = rows.filter((row) => ['applied', 'followup', 'interviewing', 'offered'].includes(row.status)).length;
  const interviews = rows.filter((row) => row.status === 'interviewing' || row.interview_date).length;
  const offers = rows.filter((row) => row.status === 'offered').length;
  const saved = rows.filter((row) => row.status === 'saved').length;
  const followUps = rows.filter((row) => row.follow_up_date).length;

  const badges = [
    saved > 0 && ['first_save', 'First Save', 'Saved your first job.', 10],
    applications > 0 && ['first_apply', 'First Application', 'Marked your first application.', 20],
    interviews > 0 && ['first_interview', 'First Interview', 'Reached the interview stage.', 50],
    offers > 0 && ['first_offer', 'First Offer', 'Logged your first offer.', 100],
    applications >= 10 && ['apps_10', '10 Applications', 'Sent 10 applications.', 50],
    applications >= 50 && ['apps_50', '50 Applications', 'Sent 50 applications.', 150],
    applications >= 100 && ['apps_100', '100 Applications', 'Sent 100 applications.', 300],
    followUps >= 5 && ['follow_up_5', 'Follow-up Pro', 'Scheduled 5 follow-ups.', 50],
    interviews >= 5 && ['interviews_5', 'Interview Run', 'Reached 5 interviews.', 100],
    streakBest >= 7 && ['streak_7', '7 Day Streak', 'Kept your application streak for a week.', 75],
    streakBest >= 30 && ['streak_30', '30 Day Streak', 'Kept your application streak for a month.', 250],
  ].filter(Boolean) as [string, string, string, number][];

  return badges.map(([type, title, description, xp_bonus]) => ({
    type,
    title,
    description,
    xp_bonus,
    unlocked_at: now,
  }));
}

export const gamificationService = {
  async getProfile(): Promise<GamificationProfile> {
    const userId = getUserId();
    const { data, error } = await supabase
      .from('user_jobs')
      .select('status,applied_date,follow_up_date,interview_date,created_at')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as UserJobRow[];
    const totalApplications = rows.filter((row) => ['applied', 'followup', 'interviewing', 'offered'].includes(row.status)).length;
    const totalInterviews = rows.filter((row) => row.status === 'interviewing' || row.interview_date).length;
    const totalOffers = rows.filter((row) => row.status === 'offered').length;
    const totalFollowUps = rows.filter((row) => row.follow_up_date).length;
    const totalSaved = rows.filter((row) => row.status === 'saved').length;
    const streak = countStreak(rows.map((row) => row.applied_date ?? ''));
    const totalXp = totalSaved * 5 + totalApplications * 20 + totalInterviews * 50 + totalOffers * 100 + totalFollowUps * 10;
    const weekStart = getWeekStart();
    const applicationsThisWeek = rows.filter((row) => row.applied_date && row.applied_date >= weekStart).length;
    const followUpsThisWeek = rows.filter((row) => row.follow_up_date && row.follow_up_date >= weekStart).length;
    const expires = new Date();
    expires.setDate(expires.getDate() + (7 - (expires.getDay() || 7)));

    const missions: Mission[] = [
      {
        id: 1,
        type: 'apply_n',
        title: 'Apply to 5 jobs this week',
        description: 'Build momentum with focused applications.',
        target: 5,
        progress: Math.min(5, applicationsThisWeek),
        xp_reward: 100,
        status: applicationsThisWeek >= 5 ? 'completed' : 'active',
        expires_at: expires.toISOString(),
      },
      {
        id: 2,
        type: 'follow_up_n',
        title: 'Schedule 3 follow-ups',
        description: 'Keep warm leads moving.',
        target: 3,
        progress: Math.min(3, followUpsThisWeek),
        xp_reward: 60,
        status: followUpsThisWeek >= 3 ? 'completed' : 'active',
        expires_at: expires.toISOString(),
      },
      {
        id: 3,
        type: 'save_n',
        title: 'Save 10 promising jobs',
        description: 'Create a shortlist for your next session.',
        target: 10,
        progress: Math.min(10, totalSaved),
        xp_reward: 40,
        status: totalSaved >= 10 ? 'completed' : 'active',
        expires_at: expires.toISOString(),
      },
    ];

    return {
      xp: xpProfile(totalXp),
      streak,
      stats: {
        totalApplications,
        totalInterviews,
        totalOffers,
        totalFollowUps,
        responseRate: totalApplications ? Math.round((totalInterviews / totalApplications) * 100) : 0,
      },
      missions,
      achievements: makeAchievements(rows, streak.best),
    };
  },
};
