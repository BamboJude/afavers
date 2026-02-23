import { ExternalJob } from '../../types/index.js';

/**
 * Normalize a string for deduplication
 * - Convert to lowercase
 * - Trim whitespace
 * - Remove extra spaces
 * - Remove special characters
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s/g, ''); // Remove all spaces for comparison
}

/**
 * Generate a deduplication key from title, company, and location
 */
function generateDeduplicationKey(title: string, company: string, location: string): string {
  return `${normalizeString(title)}_${normalizeString(company)}_${normalizeString(location)}`;
}

/**
 * Check if a job has more complete data than another
 * (Used to prefer more detailed jobs when deduplicating)
 */
function isMoreComplete(job1: ExternalJob, job2: ExternalJob): boolean {
  const score1 = calculateCompletenessScore(job1);
  const score2 = calculateCompletenessScore(job2);
  return score1 > score2;
}

/**
 * Calculate completeness score for a job
 * Higher score means more complete data
 */
function calculateCompletenessScore(job: ExternalJob): number {
  let score = 0;

  if (job.title && job.title.length > 10) score += 2;
  if (job.company && job.company !== 'Not specified') score += 2;
  if (job.location && job.location !== 'Germany') score += 1;
  if (job.description && job.description.length > 50) score += 3;
  if (job.url) score += 1;
  if (job.postedDate) score += 1;
  if (job.salary) score += 1;
  if (job.deadline) score += 1;

  return score;
}

/**
 * Deduplicate an array of external jobs
 * Returns array with duplicates removed, keeping the most complete version
 */
export function deduplicateJobs(jobs: ExternalJob[]): ExternalJob[] {
  const seen = new Map<string, ExternalJob>();

  for (const job of jobs) {
    const key = generateDeduplicationKey(job.title, job.company, job.location);

    // If we haven't seen this job, or the new one is more complete
    if (!seen.has(key) || isMoreComplete(job, seen.get(key)!)) {
      seen.set(key, job);
    }
  }

  const deduplicated = Array.from(seen.values());

  const originalCount = jobs.length;
  const deduplicatedCount = deduplicated.length;
  const removed = originalCount - deduplicatedCount;

  console.log(`🔍 Deduplication: ${originalCount} jobs → ${deduplicatedCount} jobs (removed ${removed} duplicates)`);

  return deduplicated;
}

/**
 * Group jobs by their deduplication key
 * Useful for debugging or analyzing duplicates
 */
export function groupDuplicates(jobs: ExternalJob[]): Map<string, ExternalJob[]> {
  const groups = new Map<string, ExternalJob[]>();

  for (const job of jobs) {
    const key = generateDeduplicationKey(job.title, job.company, job.location);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key)!.push(job);
  }

  return groups;
}

/**
 * Find potential duplicates within a single source
 * (Useful for quality checking individual fetchers)
 */
export function findSourceDuplicates(jobs: ExternalJob[]): ExternalJob[][] {
  const groups = groupDuplicates(jobs);
  const duplicates: ExternalJob[][] = [];

  for (const [key, group] of groups.entries()) {
    if (group.length > 1) {
      duplicates.push(group);
    }
  }

  return duplicates;
}
