import { Router } from 'express';
import { requireWorkerSecret } from '../middleware/require-secret.js';
import cronRoutes from './cron.routes.js';
import jobsRoutes from './jobs.routes.js';
import webhookRoutes from './webhook.routes.js';
import whatsappRoutes from './whatsapp.routes.js';

const router: Router = Router();

// /webhooks reste ouvert : appelé par des services externes (Lobstr) qui
// n'envoient pas notre secret. La sécurité y repose sur l'imprévisibilité de
// l'URL + la validation du runId côté handler.
router.use('/webhooks', webhookRoutes);

// /cron et /whatsapp sont appelés par NOUS (cron Railway + web Vercel) sur un
// worker public → on exige le secret partagé pour bloquer tout tiers.
router.use('/cron', requireWorkerSecret, cronRoutes);
router.use('/whatsapp', requireWorkerSecret, whatsappRoutes);

// /jobs : inspection/suppression manuelle des jobs BullMQ — destructif,
// donc même protection par secret.
router.use('/jobs', requireWorkerSecret, jobsRoutes);

export default router;
