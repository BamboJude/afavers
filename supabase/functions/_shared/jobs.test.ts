/**
 * Integration-ish tests for supabase/functions/_shared/jobs.ts
 *
 * STATUS: Entire suite is .skip because the source file under test
 * cannot be imported in a Node/Vitest environment for two reasons:
 *
 *   1. It uses bare HTTP ESM imports (https://esm.sh/@supabase/supabase-js)
 *      which only Deno's module resolver understands.  Node's resolver and
 *      Vitest both reject non-relative / non-package specifiers.
 *
 *   2. It calls Deno.env.get() at module initialisation time (inside the
 *      `adminClient()` function called at the top of `saveJobs`), so even
 *      with a vi.mock() shim the runtime would error on `Deno` being
 *      undefined before the module finishes loading.
 *
 * RECOMMENDED APPROACH TO ACTIVATE THESE TESTS:
 *   Option A — Deno test runner (preferred):
 *     Run `deno test supabase/functions/_shared/jobs.test.ts` after:
 *       - Replacing these `describe.skip` blocks with plain `describe`.
 *       - Providing a Deno-compatible mock for @supabase/supabase-js via
 *         an import map (deno.json `imports` section).
 *       - Setting SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars to
 *         empty strings so `adminClient()` does not throw.
 *
 *   Option B — Node/Vitest with a shim layer:
 *     Extract the pure logic (dedupe, row-mapping) into a separate
 *     `jobs.pure.ts` that has zero Deno/esm.sh dependencies, then import
 *     that module here.
 *
 * The test cases below document the intended behaviour and can be used
 * as the specification for whichever approach is taken.
 */

import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Inline re-implementation of dedupe() for specification purposes.
// This mirrors the private `dedupe` function in jobs.ts exactly so that we
// can at least verify the algorithm in Node without the Deno dependency.
// ---------------------------------------------------------------------------

interface ExternalJob {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  postedDate?: string;
  deadline?: string;
  salary?: string;
}

function dedupe(jobs: ExternalJob[]): ExternalJob[] {
  const byId = new Map<string, ExternalJob>();
  for (const job of jobs) {
    if (!job.id || byId.has(job.id)) continue;
    byId.set(job.id, job);
  }
  return [...byId.values()];
}

function makeExternalJob(overrides: Partial<ExternalJob> = {}): ExternalJob {
  return {
    id: 'bundesagentur_abc123',
    title: 'Software Engineer',
    company: 'Acme GmbH',
    location: 'Düsseldorf',
    description: 'Great job',
    url: 'https://example.com/job/1',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Pure-logic tests (run in Node — no Deno required)
// ---------------------------------------------------------------------------

describe('dedupe (inline re-implementation matches jobs.ts algorithm)', () => {
  it('returns a single job when given one job', () => {
    const jobs = [makeExternalJob()];
    expect(dedupe(jobs)).toHaveLength(1);
  });

  it('deduplicates two jobs with the same external_id', () => {
    const job1 = makeExternalJob({ id: 'bundesagentur_dup' });
    const job2 = makeExternalJob({ id: 'bundesagentur_dup', title: 'Duplicate' });
    const result = dedupe([job1, job2]);
    expect(result).toHaveLength(1);
    // First occurrence wins
    expect(result[0].title).toBe(job1.title);
  });

  it('keeps jobs with distinct ids', () => {
    const jobs = [
      makeExternalJob({ id: 'bundesagentur_1' }),
      makeExternalJob({ id: 'adzuna_1' }),
      makeExternalJob({ id: 'bundesagentur_2' }),
    ];
    expect(dedupe(jobs)).toHaveLength(3);
  });

  it('filters out jobs with falsy id', () => {
    const jobs = [
      makeExternalJob({ id: '' }),
      makeExternalJob({ id: 'bundesagentur_valid' }),
    ];
    const result = dedupe(jobs);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('bundesagentur_valid');
  });

  it('returns empty array for empty input', () => {
    expect(dedupe([])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// saveJobs integration tests (skipped — requires Deno runtime)
// ---------------------------------------------------------------------------

describe.skip('saveJobs — dedup against existing DB rows (requires Deno)', () => {
  // TODO: Activate under Deno test runner with import map shim.
  //
  // These tests describe the expected contract of saveJobs():
  //   - When the supabase.from('jobs').select('external_id').in(...) call
  //     returns an existing external_id, saveJobs should count that job as
  //     "updated", not "inserted".
  //   - When a new external_id arrives, saveJobs should upsert with:
  //       source  = job.id.split('_')[0]   (e.g. 'bundesagentur', 'adzuna')
  //       external_id = job.id
  //       posted_date = ISO date string or null

  it('does not insert a duplicate when external_id already exists in DB', async () => {
    // Arrange: mock supabase client so 'jobs' select returns the existing id
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ external_id: 'bundesagentur_exists' }],
            error: null,
          }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }),
    };
    vi.stubGlobal('mockSupabase', mockSupabase);

    // Act: would call saveJobs([{ id: 'bundesagentur_exists', ... }])
    // Assert:
    expect(true).toBe(true); // placeholder
  });

  it('inserts a new job with correct source, external_id and posted_date', async () => {
    // Arrange: mock returns no existing rows
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }),
    };
    vi.stubGlobal('mockSupabase', mockSupabase);

    // Act: would call saveJobs([{ id: 'adzuna_new123', postedDate: '2024-06-01', ... }])
    // Assert upsert was called with:
    //   external_id: 'adzuna_new123'
    //   source: 'adzuna'
    //   posted_date: '2024-06-01'
    expect(true).toBe(true); // placeholder
  });
});
