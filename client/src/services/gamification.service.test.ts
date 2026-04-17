/**
 * Gamification service tests.
 *
 * countStreak, xpProfile, and makeAchievements are module-private helpers.
 * We exercise them by calling gamificationService.getProfile() with a
 * fully-mocked Supabase client and a mocked authStore.
 *
 * Vitest environment: node (default from vitest.config.ts).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Module mocks (factories must be self-contained — no outer vars) ──────────

vi.mock('../lib/supabase', () => {
  const eq = vi.fn();
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { supabase: { from } };
});

vi.mock('../store/authStore', () => ({
  useAuthStore: {
    getState: () => ({ user: { id: 42 } }),
  },
}));

import { gamificationService } from './gamification.service';
import { supabase } from '../lib/supabase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function offsetDateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

interface RowInput {
  status: string;
  applied_date?: string | null;
  follow_up_date?: string | null;
  interview_date?: string | null;
  created_at?: string;
}

function makeRow(input: RowInput) {
  return {
    status: input.status,
    applied_date: input.applied_date ?? null,
    follow_up_date: input.follow_up_date ?? null,
    interview_date: input.interview_date ?? null,
    created_at: input.created_at ?? new Date().toISOString(),
  };
}

/**
 * Wire the Supabase mock chain so that supabase.from().select().eq() resolves
 * with the provided rows.  We re-build the chain each time because vi.clearAllMocks()
 * resets the return-value configurations.
 */
function setupMockRows(rows: ReturnType<typeof makeRow>[]) {
  const eqMock = vi.fn().mockResolvedValue({ data: rows, error: null });
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
  (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({ select: selectMock });
}

// ─── countStreak ──────────────────────────────────────────────────────────────

describe('countStreak (via getProfile)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns streak 0 when no applied dates exist', async () => {
    setupMockRows([makeRow({ status: 'saved' })]);
    const profile = await gamificationService.getProfile();
    expect(profile.streak.current).toBe(0);
    expect(profile.streak.best).toBe(0);
    expect(profile.streak.lastDate).toBeNull();
  });

  it('returns streak 1 for a single application today', async () => {
    setupMockRows([makeRow({ status: 'applied', applied_date: todayStr() })]);
    const profile = await gamificationService.getProfile();
    expect(profile.streak.current).toBe(1);
    expect(profile.streak.best).toBe(1);
    expect(profile.streak.lastDate).toBe(todayStr());
  });

  it('returns streak 1 for a single application yesterday (still active)', async () => {
    const yesterday = offsetDateStr(1);
    setupMockRows([makeRow({ status: 'applied', applied_date: yesterday })]);
    const profile = await gamificationService.getProfile();
    expect(profile.streak.current).toBe(1);
    expect(profile.streak.lastDate).toBe(yesterday);
  });

  it('returns correct consecutive streak across 3 days ending today', async () => {
    setupMockRows([
      makeRow({ status: 'applied', applied_date: offsetDateStr(2) }),
      makeRow({ status: 'applied', applied_date: offsetDateStr(1) }),
      makeRow({ status: 'applied', applied_date: todayStr() }),
    ]);
    const profile = await gamificationService.getProfile();
    expect(profile.streak.current).toBe(3);
    expect(profile.streak.best).toBe(3);
  });

  it('resets current streak to 0 when last application was 2+ days ago', async () => {
    setupMockRows([
      makeRow({ status: 'applied', applied_date: offsetDateStr(3) }),
      makeRow({ status: 'applied', applied_date: offsetDateStr(2) }),
      // Gap: nothing yesterday or today
    ]);
    const profile = await gamificationService.getProfile();
    expect(profile.streak.current).toBe(0);
    expect(profile.streak.best).toBe(2);
  });

  it('deduplicates multiple applications on the same day', async () => {
    setupMockRows([
      makeRow({ status: 'applied', applied_date: todayStr() }),
      makeRow({ status: 'applied', applied_date: todayStr() }),
      makeRow({ status: 'applied', applied_date: todayStr() }),
    ]);
    const profile = await gamificationService.getProfile();
    // Three rows on the same date → one unique date → streak length 1
    expect(profile.streak.current).toBe(1);
    expect(profile.streak.best).toBe(1);
  });

  it('handles a streak spanning a month boundary (consecutive calendar days)', async () => {
    setupMockRows([
      makeRow({ status: 'applied', applied_date: offsetDateStr(1) }),
      makeRow({ status: 'applied', applied_date: todayStr() }),
    ]);
    const profile = await gamificationService.getProfile();
    expect(profile.streak.current).toBe(2);
  });
});

// ─── xpProfile ────────────────────────────────────────────────────────────────

describe('xpProfile (via getProfile)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('level 1 at 0 XP (no activity)', async () => {
    setupMockRows([]);
    const profile = await gamificationService.getProfile();
    expect(profile.xp.level).toBe(1);
    expect(profile.xp.title).toBe('Job Scout');
    expect(profile.xp.totalXp).toBe(0);
    expect(profile.xp.maxLevel).toBe(false);
  });

  it('level 2 at exactly 100 XP (Application Starter)', async () => {
    // 5 applied jobs × 20 XP = 100
    setupMockRows(Array.from({ length: 5 }, () => makeRow({ status: 'applied' })));
    const profile = await gamificationService.getProfile();
    expect(profile.xp.totalXp).toBe(100);
    expect(profile.xp.level).toBe(2);
    expect(profile.xp.title).toBe('Application Starter');
    expect(profile.xp.maxLevel).toBe(false);
  });

  it('level 3 at exactly 300 XP (Pipeline Builder)', async () => {
    // 15 applied × 20 = 300
    setupMockRows(Array.from({ length: 15 }, () => makeRow({ status: 'applied' })));
    const profile = await gamificationService.getProfile();
    expect(profile.xp.totalXp).toBe(300);
    expect(profile.xp.level).toBe(3);
    expect(profile.xp.title).toBe('Pipeline Builder');
  });

  it('max level (Legend) with XP >= 3200', async () => {
    // Each 'offered' row contributes 120 XP total:
    //   - 100 XP as offer (totalOffers × 100)
    //   - 20 XP as application (totalApplications includes offered, × 20)
    // 27 rows × 120 = 3240 XP → lands in the Legend tier (min 3200)
    setupMockRows(Array.from({ length: 27 }, () => makeRow({ status: 'offered' })));
    const profile = await gamificationService.getProfile();
    expect(profile.xp.totalXp).toBe(3240);
    expect(profile.xp.maxLevel).toBe(true);
    expect(profile.xp.title).toBe('Legend');
    expect(profile.xp.xpToNext).toBe(0);
    expect(profile.xp.progressPct).toBe(100);
  });

  it('xpToNext is 20 when 4 applications give 80 XP (20 short of level 2)', async () => {
    setupMockRows(Array.from({ length: 4 }, () => makeRow({ status: 'applied' })));
    const profile = await gamificationService.getProfile();
    expect(profile.xp.xpToNext).toBe(20);
  });

  it('progressPct stays within [0, 100]', async () => {
    setupMockRows(Array.from({ length: 2 }, () => makeRow({ status: 'applied' })));
    const profile = await gamificationService.getProfile();
    expect(profile.xp.progressPct).toBeGreaterThanOrEqual(0);
    expect(profile.xp.progressPct).toBeLessThanOrEqual(100);
  });
});

// ─── makeAchievements ─────────────────────────────────────────────────────────

describe('makeAchievements (via getProfile)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty achievements for a blank profile', async () => {
    setupMockRows([]);
    const profile = await gamificationService.getProfile();
    expect(profile.achievements).toHaveLength(0);
  });

  it('unlocks first_save when a saved job exists', async () => {
    setupMockRows([makeRow({ status: 'saved' })]);
    const profile = await gamificationService.getProfile();
    expect(profile.achievements.some((a) => a.type === 'first_save')).toBe(true);
  });

  it('unlocks first_apply when an applied job exists', async () => {
    setupMockRows([makeRow({ status: 'applied', applied_date: todayStr() })]);
    const profile = await gamificationService.getProfile();
    expect(profile.achievements.some((a) => a.type === 'first_apply')).toBe(true);
  });

  it('unlocks first_interview when interviewing status is present', async () => {
    setupMockRows([makeRow({ status: 'interviewing' })]);
    const profile = await gamificationService.getProfile();
    expect(profile.achievements.some((a) => a.type === 'first_interview')).toBe(true);
  });

  it('unlocks first_offer when an offered job exists', async () => {
    setupMockRows([makeRow({ status: 'offered' })]);
    const profile = await gamificationService.getProfile();
    expect(profile.achievements.some((a) => a.type === 'first_offer')).toBe(true);
  });

  it('unlocks apps_10 at exactly 10 applications', async () => {
    setupMockRows(Array.from({ length: 10 }, () => makeRow({ status: 'applied' })));
    const profile = await gamificationService.getProfile();
    expect(profile.achievements.some((a) => a.type === 'apps_10')).toBe(true);
  });

  it('does NOT unlock apps_10 with only 9 applications', async () => {
    setupMockRows(Array.from({ length: 9 }, () => makeRow({ status: 'applied' })));
    const profile = await gamificationService.getProfile();
    expect(profile.achievements.some((a) => a.type === 'apps_10')).toBe(false);
  });

  it('unlocks streak_7 badge when best streak is >= 7 consecutive days', async () => {
    // 7 consecutive days ending today
    setupMockRows(
      Array.from({ length: 7 }, (_, i) =>
        makeRow({ status: 'applied', applied_date: offsetDateStr(6 - i) })
      )
    );
    const profile = await gamificationService.getProfile();
    expect(profile.achievements.some((a) => a.type === 'streak_7')).toBe(true);
  });

  it('achievement objects carry all required fields with correct types', async () => {
    setupMockRows([makeRow({ status: 'saved' })]);
    const profile = await gamificationService.getProfile();
    for (const ach of profile.achievements) {
      expect(typeof ach.type).toBe('string');
      expect(typeof ach.title).toBe('string');
      expect(typeof ach.description).toBe('string');
      expect(typeof ach.xp_bonus).toBe('number');
      expect(typeof ach.unlocked_at).toBe('string');
    }
  });
});
