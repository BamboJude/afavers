import { ExternalJob } from '../../types/index.js';
import { fetchBundesagenturJobs } from './bundesagentur.fetcher.js';
import { fetchStepstoneJobs } from './stepstone.fetcher.js';
import { fetchAdzunaJobs } from './adzuna.fetcher.js';
import { deduplicateJobs } from './deduplication.service.js';
import * as jobModel from '../../models/job.model.js';
import { detectLanguage } from '../../utils/languageDetect.js';

export interface FetchResult {
  total: number;
  new: number;
  updated: number;
  failed: number;
  sources: {
    bundesagentur: number;
    stepstone: number;
    adzuna: number;
  };
}

/**
 * Main job fetcher orchestrator
 * Fetches jobs from Bundesagentur für Arbeit, deduplicates, and saves to database
 */
export async function fetchAndSaveJobs(): Promise<FetchResult> {
  const startTime = Date.now();

  console.log('\n🚀 Starting job fetch from all sources...\n');

  let bundesagenturJobs: ExternalJob[] = [];
  let stepstoneJobs: ExternalJob[] = [];
  let adzunaJobs: ExternalJob[] = [];

  try {
    bundesagenturJobs = await fetchBundesagenturJobs();
  } catch (error) {
    console.error('❌ Bundesagentur fetcher failed:', error);
  }

  try {
    stepstoneJobs = await fetchStepstoneJobs();
  } catch (error) {
    console.error('❌ StepStone fetcher failed:', error);
  }

  try {
    adzunaJobs = await fetchAdzunaJobs();
  } catch (error) {
    console.error('❌ Adzuna fetcher failed:', error);
  }

  const allJobs = [...bundesagenturJobs, ...stepstoneJobs, ...adzunaJobs];

  console.log(`\n📊 Fetch Summary:`);
  console.log(`   Bundesagentur: ${bundesagenturJobs.length} jobs`);
  console.log(`   StepStone:     ${stepstoneJobs.length} jobs`);
  console.log(`   Adzuna:        ${adzunaJobs.length} jobs`);

  // Deduplicate across all sources
  const deduplicatedJobs = deduplicateJobs(allJobs);
  console.log(`   After deduplication: ${deduplicatedJobs.length} jobs`);

  // Save to database
  console.log('\n💾 Saving jobs to database...');
  const saveResult = await saveJobsToDatabase(deduplicatedJobs);

  // Remove stale jobs (no longer returned by source, user hasn't interacted)
  console.log('\n🧹 Cleaning up stale jobs...');
  const staleDeleted = { bundesagentur: 0, stepstone: 0, adzuna: 0 };
  if (bundesagenturJobs.length > 0) {
    staleDeleted.bundesagentur = await jobModel.deleteStaleJobs('bundesagentur', bundesagenturJobs.map(j => j.id));
  }
  if (stepstoneJobs.length > 0) {
    staleDeleted.stepstone = await jobModel.deleteStaleJobs('stepstone', stepstoneJobs.map(j => j.id));
  }
  if (adzunaJobs.length > 0) {
    staleDeleted.adzuna = await jobModel.deleteStaleJobs('adzuna', adzunaJobs.map(j => j.id));
  }
  const totalDeleted = staleDeleted.bundesagentur + staleDeleted.stepstone + staleDeleted.adzuna;
  if (totalDeleted > 0) {
    console.log(`   Deleted ${totalDeleted} stale jobs (bundesagentur: ${staleDeleted.bundesagentur}, stepstone: ${staleDeleted.stepstone}, adzuna: ${staleDeleted.adzuna})`);
  }

  const duration = Math.round((Date.now() - startTime) / 1000);

  console.log('\n✅ Job fetch complete!');
  console.log(`   Duration: ${duration}s`);
  console.log(`   New jobs: ${saveResult.inserted}`);
  console.log(`   Updated jobs: ${saveResult.updated}`);
  console.log(`   Stale deleted: ${totalDeleted}`);
  console.log(`   Failed: ${saveResult.failed}\n`);

  return {
    total: deduplicatedJobs.length,
    new: saveResult.inserted,
    updated: saveResult.updated,
    failed: saveResult.failed,
    sources: {
      bundesagentur: bundesagenturJobs.length,
      stepstone: stepstoneJobs.length,
      adzuna: adzunaJobs.length,
    },
  };
}

/**
 * Save external jobs to database
 * Updates existing jobs or creates new ones
 */
async function saveJobsToDatabase(jobs: ExternalJob[]): Promise<{
  inserted: number;
  updated: number;
  failed: number;
}> {
  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const externalJob of jobs) {
    try {
      // Check if job already exists
      const existing = await jobModel.findByExternalId(externalJob.id);

      if (existing) {
        // Update existing job only if data changed
        const hasChanges =
          existing.title !== externalJob.title ||
          existing.description !== externalJob.description ||
          existing.location !== externalJob.location;

        if (hasChanges) {
          const language = detectLanguage(externalJob.title, externalJob.description || '');
          await jobModel.updateJobCore(existing.id, {
            title: externalJob.title,
            company: externalJob.company,
            location: externalJob.location,
            description: externalJob.description,
            url: externalJob.url,
            posted_date: externalJob.postedDate ? new Date(externalJob.postedDate) : null,
            deadline: externalJob.deadline ? new Date(externalJob.deadline) : null,
            salary: externalJob.salary || null,
            language,
          });
          updated++;
        }
      } else {
        // Create new job
        const source = externalJob.id.split('_')[0]; // Extract source from ID
        const language = detectLanguage(externalJob.title, externalJob.description || '');

        await jobModel.create({
          external_id: externalJob.id,
          title: externalJob.title,
          company: externalJob.company,
          location: externalJob.location,
          description: externalJob.description,
          url: externalJob.url,
          source,
          posted_date: externalJob.postedDate ? new Date(externalJob.postedDate) : null,
          deadline: externalJob.deadline ? new Date(externalJob.deadline) : null,
          salary: externalJob.salary || null,
          language,
        });
        inserted++;
      }
    } catch (error) {
      console.error(`Error saving job ${externalJob.id}:`, error);
      failed++;
    }
  }

  return { inserted, updated, failed };
}
