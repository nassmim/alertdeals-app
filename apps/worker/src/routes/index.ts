import { Router } from 'express';
import cronRoutes from './cron.routes.js';
import webhookRoutes from './webhook.routes.js';

const router: Router = Router();

router.use('/webhooks', webhookRoutes);
router.use('/cron', cronRoutes);

export default router;
