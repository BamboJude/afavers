import { pool } from '../config/database.js';

// ── XP values per action ──────────────────────────────────────────────────────
export const XP_VALUES: Record<string, number> = {
  save_job:         5,
  apply:            25,
  follow_up:        15,
  interview:        50,
  offer:            100,
  daily_login:      5,
  mission_complete: 0,  // set per-mission
};

// ── Level thresholds ──────────────────────────────────────────────────────────
const LEVELS = [
  { level: 1, xp: 0,    title: 'Rookie'   },
  { level: 2, xp: 100,  title: 'Explorer' },
  { level: 3, xp: 300,  title: 'Hunter'   },
  { level: 4, xp: 700,  title: 'Hustler'  },
  { level: 5, xp: 1500, title: 'Pro'      },
  { level: 6, xp: 3000, title: 'Expert'   },
  { level: 7, xp: 6000, title: 'Legend'   },
];

export function calcLevel(totalXp: number) {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (totalXp >= l.xp) current = l;
    else break;
  }
  const next = LEVELS.find(l => l.xp > totalXp);
  const xpToNext = next ? next.xp - totalXp : 0;
  const xpInLevel = next ? totalXp - current.xp : 0;
  const xpRange = next ? next.xp - current.xp : 1;
  return {
    level: current.level,
    title: current.title,
    totalXp,
    xpToNext,
    progressPct: Math.round((xpInLevel / xpRange) * 100),
    maxLevel: current.level === LEVELS[LEVELS.length - 1].level,
  };
}

// ── Achievements catalog ──────────────────────────────────────────────────────
const ACHIEVEMENT_DEFS: Record<string, { title: string; description: string; xpBonus: number }> = {
  first_save:      { title: 'First Save',        description: 'Saved your first job',                xpBonus: 10  },
  first_apply:     { title: 'First Application', description: 'Submitted your first application',    xpBonus: 50  },
  first_interview: { title: 'First Interview',   description: 'Landed your first interview',         xpBonus: 100 },
  first_offer:     { title: 'First Offer',       description: 'Received your first job offer',       xpBonus: 200 },
  apps_10:         { title: '10 Applications',   description: 'Applied to 10 jobs',                  xpBonus: 75  },
  apps_50:         { title: '50 Applications',   description: 'Applied to 50 jobs — relentless',     xpBonus: 150 },
  apps_100:        { title: '100 Applications',  description: '100 applications. Legend.',            xpBonus: 300 },
  follow_up_5:     { title: 'Persistent',        description: 'Followed up on 5 applications',       xpBonus: 50  },
  interviews_5:    { title: 'Interview Pro',     description: 'Reached 5 interviews',                xpBonus: 100 },
  streak_7:        { title: '7-Day Streak',      description: 'Applied every day for 7 days',        xpBonus: 100 },
  streak_30:       { title: '30-Day Streak',     description: 'Applied every day for 30 days',       xpBonus: 500 },
};

// ── Ensure user_gamification row exists ───────────────────────────────────────
async function ensureProfile(userId: number): Promise<void> {
  await pool.query(
    `INSERT INTO user_gamification (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
}

// ── Award XP ─────────────────────────────────────────────────────────────────
export async function awardXP(
  userId: number,
  action: string,
  xpOverride?: number,
  jobId?: number,
  metadata?: Record<string, unknown>,
): Promise<{ totalXp: number; level: number; leveledUp: boolean }> {
  const xp = xpOverride ?? XP_VALUES[action] ?? 0;
  if (xp === 0 && !xpOverride) return { totalXp: 0, level: 1, leveledUp: false };

  await ensureProfile(userId);

  // Get level before update
  const before = await pool.query<{ level: number }>(
    `SELECT level FROM user_gamification WHERE user_id = $1`,
    [userId],
  );
  const levelBefore = before.rows[0]?.level ?? 1;

  // Log the XP event
  await pool.query(
    `INSERT INTO xp_events (user_id, action, xp, job_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, action, xp, jobId ?? null, metadata ? JSON.stringify(metadata) : null],
  );

  // Update total_xp and recalculate level
  const result = await pool.query<{ total_xp: number }>(
    `UPDATE user_gamification
     SET total_xp = total_xp + $2, updated_at = NOW()
     WHERE user_id = $1
     RETURNING total_xp`,
    [userId, xp],
  );
  const newTotalXp = result.rows[0].total_xp;
  const newLevel = calcLevel(newTotalXp).level;

  // Persist new level
  await pool.query(
    `UPDATE user_gamification SET level = $2 WHERE user_id = $1`,
    [userId, newLevel],
  );

  return { totalXp: newTotalXp, level: newLevel, leveledUp: newLevel > levelBefore };
}

// ── Update application streak ─────────────────────────────────────────────────
// Grace period: 1 missed day is allowed (streak doesn't break until 2+ days missed)
export async function updateStreak(userId: number): Promise<{ current: number; best: number }> {
  await ensureProfile(userId);

  const row = await pool.query<{
    app_streak_current: number;
    app_streak_best: number;
    app_streak_last_date: string | null;
  }>(
    `SELECT app_streak_current, app_streak_best, app_streak_last_date
     FROM user_gamification WHERE user_id = $1`,
    [userId],
  );
  const g = row.rows[0];
  const today = new Date().toISOString().slice(0, 10);
  const lastDate = g.app_streak_last_date;

  if (lastDate === today) {
    // Already counted today
    return { current: g.app_streak_current, best: g.app_streak_best };
  }

  let newStreak = 1;
  if (lastDate) {
    const last = new Date(lastDate);
    const todayD = new Date(today);
    const diffDays = Math.round((todayD.getTime() - last.getTime()) / 86400000);
    if (diffDays === 1) newStreak = g.app_streak_current + 1;          // consecutive
    else if (diffDays === 2) newStreak = g.app_streak_current + 1;     // grace period
    // else > 2 days: streak resets to 1
  }

  const newBest = Math.max(newStreak, g.app_streak_best);

  await pool.query(
    `UPDATE user_gamification
     SET app_streak_current = $2, app_streak_best = $3,
         app_streak_last_date = $4, updated_at = NOW()
     WHERE user_id = $1`,
    [userId, newStreak, newBest, today],
  );

  return { current: newStreak, best: newBest };
}

// ── Increment a lifetime counter ──────────────────────────────────────────────
async function incrementCounter(
  userId: number,
  column: 'total_applications' | 'total_interviews' | 'total_offers' | 'total_follow_ups',
): Promise<number> {
  const result = await pool.query<{ val: number }>(
    `UPDATE user_gamification
     SET ${column} = ${column} + 1, updated_at = NOW()
     WHERE user_id = $1
     RETURNING ${column} AS val`,
    [userId],
  );
  return result.rows[0]?.val ?? 0;
}

// ── Check and unlock achievements ─────────────────────────────────────────────
export async function checkAchievements(
  userId: number,
  action: string,
): Promise<string[]> {
  await ensureProfile(userId);

  const profile = await pool.query<{
    total_applications: number;
    total_interviews: number;
    total_offers: number;
    total_follow_ups: number;
    app_streak_current: number;
    app_streak_best: number;
  }>(
    `SELECT total_applications, total_interviews, total_offers,
            total_follow_ups, app_streak_current, app_streak_best
     FROM user_gamification WHERE user_id = $1`,
    [userId],
  );
  const p = profile.rows[0];
  if (!p) return [];

  const unlocked: string[] = [];

  const candidates: string[] = [];
  if (action === 'save_job')  candidates.push('first_save');
  if (action === 'apply') {
    candidates.push('first_apply');
    if (p.total_applications >= 10)  candidates.push('apps_10');
    if (p.total_applications >= 50)  candidates.push('apps_50');
    if (p.total_applications >= 100) candidates.push('apps_100');
  }
  if (action === 'interview') {
    candidates.push('first_interview');
    if (p.total_interviews >= 5) candidates.push('interviews_5');
  }
  if (action === 'offer') candidates.push('first_offer');
  if (action === 'follow_up' && p.total_follow_ups >= 5) candidates.push('follow_up_5');
  if (p.app_streak_current >= 7)  candidates.push('streak_7');
  if (p.app_streak_current >= 30) candidates.push('streak_30');

  for (const type of candidates) {
    const def = ACHIEVEMENT_DEFS[type];
    if (!def) continue;
    try {
      await pool.query(
        `INSERT INTO achievements (user_id, type, title, description, xp_bonus)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, type, def.title, def.description, def.xpBonus],
      );
      // Award bonus XP for the achievement
      if (def.xpBonus > 0) {
        await awardXP(userId, 'achievement', def.xpBonus, undefined, { achievement: type });
      }
      unlocked.push(type);
    } catch {
      // UNIQUE violation — already unlocked, skip
    }
  }

  return unlocked;
}

// ── Update mission progress ───────────────────────────────────────────────────
export async function updateMissionProgress(
  userId: number,
  action: string,
): Promise<void> {
  const missionTypeMap: Record<string, string[]> = {
    apply:     ['apply_n', 'apply_daily_3'],
    follow_up: ['follow_up_n'],
    interview: ['get_interview'],
    offer:     ['get_offer'],
  };
  const missionTypes = missionTypeMap[action];
  if (!missionTypes) return;

  const today = new Date().toISOString().slice(0, 10);
  const weekStart = getWeekStart();

  for (const mtype of missionTypes) {
    const result = await pool.query<{ id: number; target: number; progress: number; xp_reward: number }>(
      `UPDATE missions
       SET progress = LEAST(progress + 1, target), updated_at = NOW()
       WHERE user_id = $1 AND type = $2 AND status = 'active'
         AND week_start = $3
       RETURNING id, target, progress, xp_reward`,
      [userId, mtype, weekStart],
    );
    for (const mission of result.rows) {
      if (mission.progress >= mission.target) {
        await pool.query(
          `UPDATE missions SET status = 'completed', completed_at = NOW()
           WHERE id = $1`,
          [mission.id],
        );
        await awardXP(userId, 'mission_complete', mission.xp_reward, undefined, {
          mission_type: mtype,
        });
      }
    }
  }

  void today; // silence unused warning
}

// ── Generate weekly missions ──────────────────────────────────────────────────
// Called on first request each week. Dynamically tailored to user behavior.
export async function generateWeeklyMissions(userId: number): Promise<void> {
  const weekStart = getWeekStart();

  // Already generated this week?
  const existing = await pool.query(
    `SELECT id FROM missions WHERE user_id = $1 AND week_start = $2 LIMIT 1`,
    [userId, weekStart],
  );
  if (existing.rowCount && existing.rowCount > 0) return;

  // Expire last week's unfinished missions
  await pool.query(
    `UPDATE missions SET status = 'expired'
     WHERE user_id = $1 AND status = 'active' AND week_start < $2`,
    [userId, weekStart],
  );

  const profile = await pool.query<{ total_applications: number; total_follow_ups: number }>(
    `SELECT total_applications, total_follow_ups FROM user_gamification WHERE user_id = $1`,
    [userId],
  );
  const p = profile.rows[0] ?? { total_applications: 0, total_follow_ups: 0 };

  // Difficulty scales with experience
  const applyTarget = p.total_applications < 10 ? 3 : p.total_applications < 30 ? 5 : 10;
  const followTarget = p.total_follow_ups < 5 ? 2 : 3;

  const weekEnd = getWeekEnd();
  const missions = [
    {
      type: 'apply_n',
      title: `Apply to ${applyTarget} jobs`,
      description: `Submit ${applyTarget} applications before the week ends.`,
      target: applyTarget,
      xp_reward: applyTarget * 20,
    },
    {
      type: 'follow_up_n',
      title: `Follow up on ${followTarget} applications`,
      description: `Send ${followTarget} follow-ups to companies you've applied to.`,
      target: followTarget,
      xp_reward: followTarget * 25,
    },
    {
      type: 'get_interview',
      title: 'Land an interview',
      description: 'Update any application to Interviewing status this week.',
      target: 1,
      xp_reward: 100,
    },
  ];

  for (const m of missions) {
    await pool.query(
      `INSERT INTO missions (user_id, type, title, description, target, xp_reward, week_start, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, m.type, m.title, m.description, m.target, m.xp_reward, weekStart, weekEnd],
    );
  }
}

// ── Handle a tracked action (single entry point called from routes) ───────────
export async function handleAction(
  userId: number,
  action: 'save_job' | 'apply' | 'follow_up' | 'interview' | 'offer' | 'daily_login',
  jobId?: number,
): Promise<{
  xpGained: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
  streakCurrent: number;
  unlockedAchievements: string[];
}> {
  await ensureProfile(userId);

  // Award XP
  const xp = XP_VALUES[action] ?? 0;
  const xpResult = await awardXP(userId, action, xp, jobId);

  // Update counters
  if (action === 'apply')     await incrementCounter(userId, 'total_applications');
  if (action === 'interview') await incrementCounter(userId, 'total_interviews');
  if (action === 'offer')     await incrementCounter(userId, 'total_offers');
  if (action === 'follow_up') await incrementCounter(userId, 'total_follow_ups');

  // Update streak
  let streakCurrent = 0;
  if (action === 'apply' || action === 'daily_login') {
    const streak = await updateStreak(userId);
    streakCurrent = streak.current;
  }

  // Check achievements
  const unlockedAchievements = await checkAchievements(userId, action);

  // Update mission progress
  await updateMissionProgress(userId, action);

  return {
    xpGained: xp,
    totalXp: xpResult.totalXp,
    level: xpResult.level,
    leveledUp: xpResult.leveledUp,
    streakCurrent,
    unlockedAchievements,
  };
}

// ── Get full gamification profile ─────────────────────────────────────────────
export async function getProfile(userId: number) {
  await ensureProfile(userId);
  await generateWeeklyMissions(userId);

  const [profileRes, missionsRes, achievementsRes, recentXpRes] = await Promise.all([
    pool.query<{
      total_xp: number; level: number;
      app_streak_current: number; app_streak_best: number; app_streak_last_date: string | null;
      total_applications: number; total_interviews: number;
      total_offers: number; total_follow_ups: number;
    }>(
      `SELECT total_xp, level, app_streak_current, app_streak_best, app_streak_last_date,
              total_applications, total_interviews, total_offers, total_follow_ups
       FROM user_gamification WHERE user_id = $1`,
      [userId],
    ),
    pool.query(
      `SELECT id, type, title, description, target, progress, xp_reward, status, expires_at, completed_at
       FROM missions
       WHERE user_id = $1 AND week_start = $2
       ORDER BY status ASC, created_at ASC`,
      [userId, getWeekStart()],
    ),
    pool.query(
      `SELECT type, title, description, xp_bonus, unlocked_at
       FROM achievements WHERE user_id = $1 ORDER BY unlocked_at DESC`,
      [userId],
    ),
    pool.query(
      `SELECT action, xp, created_at FROM xp_events
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [userId],
    ),
  ]);

  const p = profileRes.rows[0];
  const levelInfo = calcLevel(p.total_xp);

  // Response rate insight
  const responseRate = p.total_applications > 0
    ? Math.round(((p.total_interviews + p.total_offers) / p.total_applications) * 100)
    : 0;

  return {
    xp: levelInfo,
    streak: {
      current: p.app_streak_current,
      best: p.app_streak_best,
      lastDate: p.app_streak_last_date,
    },
    stats: {
      totalApplications: p.total_applications,
      totalInterviews: p.total_interviews,
      totalOffers: p.total_offers,
      totalFollowUps: p.total_follow_ups,
      responseRate,
    },
    missions: missionsRes.rows,
    achievements: achievementsRes.rows,
    recentXp: recentXpRes.rows,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

function getWeekEnd(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Sunday
  const sunday = new Date(d.setDate(diff));
  sunday.setHours(23, 59, 59, 999);
  return sunday.toISOString();
}
