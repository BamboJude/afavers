import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'https://server-production-ebd2b.up.railway.app';

interface Mission {
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

interface Achievement {
  type: string;
  title: string;
  description: string;
  xp_bonus: number;
  unlocked_at: string;
}

interface GamificationProfile {
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

const LEVEL_COLORS: Record<number, string> = {
  1: 'from-gray-400 to-gray-500',
  2: 'from-green-400 to-emerald-500',
  3: 'from-blue-400 to-indigo-500',
  4: 'from-violet-400 to-purple-500',
  5: 'from-orange-400 to-amber-500',
  6: 'from-rose-400 to-pink-500',
  7: 'from-yellow-400 to-orange-500',
};

const ACHIEVEMENT_ICONS: Record<string, string> = {
  first_save: '🔖', first_apply: '📨', first_interview: '🎙️', first_offer: '🏆',
  apps_10: '🔟', apps_50: '⚡', apps_100: '💯',
  follow_up_5: '📬', interviews_5: '🎯',
  streak_7: '🔥', streak_30: '🌟',
};

export const GamificationWidget = () => {
  const { token, isDemo } = useAuthStore();
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [tab, setTab] = useState<'missions' | 'achievements'>('missions');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo || !token) { setLoading(false); return; }
    fetch(`${API_URL}/api/gamification`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, isDemo]);

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden animate-pulse">
        <div className="h-24 bg-gray-100" />
        <div className="p-4 space-y-2">
          <div className="h-3 bg-gray-100 rounded-full w-3/4" />
          <div className="h-3 bg-gray-100 rounded-full w-1/2" />
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const { xp, streak, missions, achievements } = profile;
  const activeMissions = missions.filter(m => m.status === 'active');
  const completedMissions = missions.filter(m => m.status === 'completed');
  const gradClass = LEVEL_COLORS[xp.level] || LEVEL_COLORS[7];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

      {/* ── Level header ── */}
      <div className={`bg-gradient-to-r ${gradClass} px-5 py-4`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Level {xp.level}</p>
            <p className="text-white text-lg font-black leading-tight">{xp.title}</p>
          </div>
          <div className="text-right">
            {streak.current > 1 && (
              <div className="flex items-center gap-1 justify-end mb-1">
                <span className="text-lg">🔥</span>
                <span className="text-white font-black text-sm">{streak.current}d</span>
              </div>
            )}
            <p className="text-white/70 text-[10px]">{xp.totalXp.toLocaleString()} XP total</p>
          </div>
        </div>

        {/* XP progress bar */}
        {!xp.maxLevel && (
          <div>
            <div className="h-1.5 bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-700"
                style={{ width: `${xp.progressPct}%` }}
              />
            </div>
            <p className="text-white/70 text-[10px] mt-1">{xp.xpToNext} XP to next level</p>
          </div>
        )}
        {xp.maxLevel && (
          <p className="text-white/80 text-xs font-bold">Max level reached 🌟</p>
        )}
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex border-b border-gray-100">
        {(['missions', 'achievements'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-widest transition ${
              tab === t ? 'text-[#16a34a] border-b-2 border-[#16a34a]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t === 'missions' ? `Missions ${completedMissions.length}/${missions.length}` : `Badges ${achievements.length}`}
          </button>
        ))}
      </div>

      {/* ── Missions ── */}
      {tab === 'missions' && (
        <div className="p-4 space-y-3">
          {activeMissions.length === 0 && completedMissions.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No missions this week yet.</p>
          )}
          {activeMissions.map(m => {
            const pct = Math.round((m.progress / m.target) * 100);
            return (
              <div key={m.id} className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12px] font-bold text-[#0a1a25] leading-snug">{m.title}</p>
                  <span className="text-[10px] font-black text-[#16a34a] bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full shrink-0">
                    +{m.xp_reward} XP
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#16a34a] rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 shrink-0">
                    {m.progress}/{m.target}
                  </span>
                </div>
              </div>
            );
          })}
          {completedMissions.map(m => (
            <div key={m.id} className="flex items-center gap-2.5 opacity-60">
              <span className="text-base shrink-0">✅</span>
              <p className="text-[11px] font-semibold text-gray-500 line-through">{m.title}</p>
              <span className="ml-auto text-[10px] font-bold text-gray-400 shrink-0">+{m.xp_reward} XP</span>
            </div>
          ))}
          {activeMissions.length > 0 && (
            <p className="text-[10px] text-gray-400 text-center pt-1">
              Missions reset every Monday
            </p>
          )}
        </div>
      )}

      {/* ── Achievements ── */}
      {tab === 'achievements' && (
        <div className="p-4">
          {achievements.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">
              Apply to jobs to earn your first badge.
            </p>
          )}
          <div className="grid grid-cols-3 gap-2">
            {achievements.map(a => (
              <div
                key={a.type}
                className="flex flex-col items-center text-center gap-1 p-2 bg-gray-50 rounded-xl border border-gray-100"
                title={a.description}
              >
                <span className="text-2xl">{ACHIEVEMENT_ICONS[a.type] ?? '🏅'}</span>
                <p className="text-[9px] font-bold text-[#0a1a25] leading-tight">{a.title}</p>
                {a.xp_bonus > 0 && (
                  <p className="text-[8px] text-[#16a34a] font-bold">+{a.xp_bonus} XP</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
