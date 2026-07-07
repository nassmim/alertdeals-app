/**
 * Jobs Routes — inspection et nettoyage manuel des queues BullMQ.
 *
 * Cas d'usage typique : un job en `failed` garde son jobId dans Redis et
 * bloque la déduplication (event "duplicated" si on re-poste le webhook).
 * Ces endpoints permettent de le supprimer proprement sans ouvrir Redis.
 *
 * Montées derrière `requireWorkerSecret` (cf. routes/index.ts) : actions
 * destructives, réservées à nous.
 */

import { Request, Response, Router } from "express";
import { getQueueStats, queues } from "../queues/index.js";

const router: Router = Router();

const getQueueOrRespond404 = (queueName: string, res: Response) => {
  const queue = queues[queueName as keyof typeof queues];
  if (!queue) {
    res.status(404).json({ error: `Queue "${queueName}" not found` });
    return null;
  }
  return queue;
};

/**
 * GET /jobs/:queue
 * Stats de la queue + les derniers jobs failed (id, raison, date) pour
 * diagnostiquer sans Redis Insight.
 */
router.get("/:queue", async (req: Request, res: Response) => {
  const queueName = String(req.params.queue ?? "");
  const queue = getQueueOrRespond404(queueName, res);
  if (!queue) return;

  const [stats, failedJobs] = await Promise.all([
    getQueueStats(queueName),
    queue.getFailed(0, 19),
  ]);

  res.json({
    stats,
    failed: failedJobs.map((job) => ({
      jobId: job.id,
      attemptsMade: job.attemptsMade,
      finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
      failedReason: job.failedReason,
    })),
  });
});

/**
 * DELETE /jobs/:queue/:jobId
 * Supprime un job précis (libère son jobId pour la déduplication).
 * Refuse les jobs `active` : ils sont verrouillés par un worker en cours.
 */
router.delete("/:queue/:jobId", async (req: Request, res: Response) => {
  const queueName = String(req.params.queue ?? "");
  const jobId = String(req.params.jobId ?? "");
  const queue = getQueueOrRespond404(queueName, res);
  if (!queue) return;

  const job = await queue.getJob(jobId);
  if (!job) {
    return res
      .status(404)
      .json({ error: `Job "${jobId}" not found in queue "${queueName}"` });
  }

  const state = await job.getState();
  try {
    await job.remove();
  } catch (error) {
    // BullMQ lève une erreur si le job est verrouillé (active).
    return res.status(409).json({
      error: `Job "${jobId}" could not be removed (state: ${state})`,
      details: error instanceof Error ? error.message : String(error),
    });
  }

  res.json({ success: true, removedJobId: jobId, previousState: state });
});

/**
 * DELETE /jobs/:queue
 * Vide la queue : jobs en attente/retardés (drain) + completed + failed.
 * Les jobs `active` ne sont pas touchés (verrouillés par un worker).
 */
router.delete("/:queue", async (req: Request, res: Response) => {
  const queueName = String(req.params.queue ?? "");
  const queue = getQueueOrRespond404(queueName, res);
  if (!queue) return;

  await queue.drain(true); // true = supprime aussi les jobs delayed
  const [completedRemoved, failedRemoved] = await Promise.all([
    queue.clean(0, 0, "completed"),
    queue.clean(0, 0, "failed"),
  ]);

  res.json({
    success: true,
    queue: queueName,
    removed: {
      completed: completedRemoved.length,
      failed: failedRemoved.length,
    },
  });
});

export default router;
