/**
 * WhatsApp Routes — pairing du numéro central depuis l'UI admin.
 * La logique vit dans le controller ; la route ne fait que câbler l'endpoint.
 */

import { Router } from 'express';
import { connectWhatsAppController } from '../controllers/whatsapp.controller.js';

const router: Router = Router();

// POST /api/whatsapp/connect — ouvre un socket Baileys, renvoie le QR à scanner.
router.post('/connect', connectWhatsAppController);

export default router;
