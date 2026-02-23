import { ExternalJob, Job } from '../../types/index.js';
import { fetchBundesagenturJobs } from './bundesagentur.fetcher.js';
import { fetchAdzunaJobs } from './adzuna.fetcher.js';
import { scrapeGreenjobs } from './greenjobs.scraper.js';
import { deduplicateJobs } from './deduplication.service.js';
import * as jobModel from '../../models/job.model.js';

export interface FetchResult {
  total: number;
  new: number;
  updated: number;
  failed: number;
  sources: {
    bundesagentur: number;
    adzuna: number;
    greenjobs: number;
  };
}

/**
 * Main job fetcher orchestrator
 * Fetches jobs from all sources, deduplicates, and saves to database
 */
export async function fetchAndSaveJobs(): Promise<FetchResult> {
  const startTime = Date.now();

  console.log('\n🚀 Starting job fetch from all sources...\n');

  // Run all fetchers in parallel
  const results = await Promise.allSettled([
    fetchBundesagenturJobs(),
    fetchAdzunaJobs(),
    scrapeGreenjobs()
  ]);

  // Collect successful results
  const bundesagenturJobs = results[0].status === 'fulfilled' ? results[0].value : [];
  const adzunaJobs = results[1].status === 'fulfilled' ? results[1].value : [];
  const greenjobsJobs = results[2].status === 'fulfilled' ? results[2].value : [];

  // Log any failures
  if (results[0].status === 'rejected') {
    console.error('❌ Bundesagentur fetcher failed:', results[0].reason);
  }
  if (results[1].status === 'rejected') {
    console.error('❌ Adzuna fetcher failed:', results[1].reason);
  }
  if (results[2].status === 'rejected') {
    console.error('❌ greenjobs fetcher failed:', results[2].reason);
  }

  // Combine all jobs
  const allJobs = [...bundesagenturJobs, ...adzunaJobs, ...greenjobsJobs];

  console.log(`\n📊 Fetch Summary:`);
  console.log(`   Bundesagentur: ${bundesagenturJobs.length} jobs`);
  console.log(`   Adzuna: ${adzunaJobs.length} jobs`);
  console.log(`   greenjobs.de: ${greenjobsJobs.length} jobs`);
  console.log(`   Total: ${allJobs.length} jobs`);

  // Deduplicate jobs
  const deduplicatedJobs = deduplicateJobs(allJobs);

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
      adzuna: adzunaJobs.length,
      greenjobs: greenjobsJobs.length
    }
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
          await jobModel.update(existing.id, {
            title: externalJob.title,
            company: externalJob.company,
            location: externalJob.location,
            description: externalJob.description,
            url: externalJob.url,
            posted_date: externalJob.postedDate ? new Date(externalJob.postedDate) : null,
            deadline: externalJob.deadline ? new Date(externalJob.deadline) : null,
            salary: externalJob.salary || null
          });
          updated++;
        }
      } else {
        // Create new job
        const source = externalJob.id.split('_')[0]; // Extract source from ID

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
          status: 'new'
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
