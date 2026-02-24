import { ExternalJob } from '../../types/index.js';
import { fetchBundesagenturJobs } from './bundesagentur.fetcher.js';
import { fetchStepstoneJobs } from './stepstone.fetcher.js';
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

  const allJobs = [...bundesagenturJobs, ...stepstoneJobs];

  console.log(`\n📊 Fetch Summary:`);
  console.log(`   Bundesagentur: ${bundesagenturJobs.length} jobs`);
  console.log(`   StepStone:     ${stepstoneJobs.length} jobs`);

  // Deduplicate across all sources
  const deduplicatedJobs = deduplicateJobs(allJobs);
  console.log(`   After deduplication: ${deduplicatedJobs.length} jobs`);

  // Save to database
  console.log('\n💾 Saving jobs to database...');
  const saveResult = await saveJobsToDatabase(deduplicatedJobs);

  const duration = Math.round((Date.now() - startTime) / 1000);

  console.log('\n✅ Job fetch complete!');
  console.log(`   Duration: ${duration}s`);
  console.log(`   New jobs: ${saveResult.inserted}`);
  console.log(`   Updated jobs: ${saveResult.updated}`);
  console.log(`   Failed: ${saveResult.failed}\n`);

  return {
    total: deduplicatedJobs.length,
    new: saveResult.inserted,
    updated: saveResult.updated,
    failed: saveResult.failed,
    sources: {
      bundesagentur: bundesagenturJobs.length,
      stepstone: stepstoneJobs.length,
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
