import { EWorkerErrorCode } from '@alertdeals/shared';
import { Request, Response, Router } from 'express';
import { dailyOrchestratorQueue } from '../queues/index.js';

const router: Router = Router();

/**
 * POST /api/cron/daily-matches
 * Enqueues a daily-orchestrator job that recomputes matched_ads for every
 * active alert. Expected schedule: once a day (e.g. "0 4 * * *").
 */
router.post('/daily-matches', async (_req: Request, res: Response) => {
  try {
    const triggeredAt = new Date().toISOString();
    const job = await dailyOrchestratorQueue.add('daily-orchestrator', {
      triggeredAt,
      source: 'cron',
    });
    res.json({ success: true, jobId: job.id, triggeredAt });
  } catch (error) {
    res.status(500).json({
      error: EWorkerErrorCode.CRON_DISPATCH_FAILED,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
