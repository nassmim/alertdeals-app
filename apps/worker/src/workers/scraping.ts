/**
 * Scraping Worker — processes Lobstr webhook jobs and persists ads.
 */

import { TAdSource } from '@alertdeals/shared';
import { Job, UnrecoverableError } from 'bullmq';
import { handleLobstrWebhook } from '../services/lobstr.service.js';

interface ScrapingJob {
  runId: string;
  source: TAdSource; // Listing platform, resolved from the webhook's squid id
}

export async function scrapingWorker(job: Job<ScrapingJob>) {
  const { runId, source } = job.data;

  if (!runId) {
    // No retry — a job without runId is permanently invalid.
    throw new UnrecoverableError('Lobstr run ID is required');
  }

  if (!source) {
    throw new UnrecoverableError('Ad source is required');
  }

  await handleLobstrWebhook(runId, source);

  return {
    success: true,
    runId,
    source,
    timestamp: new Date().toISOString(),
  };
}
