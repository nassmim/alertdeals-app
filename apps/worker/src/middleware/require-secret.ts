/**
 * Auth Bearer pour les endpoints internes du worker.
 *
 * Le worker est exposé publiquement (le web hébergé sur Vercel l'appelle depuis
 * Internet, hors réseau privé Railway). Les endpoints sensibles — pairing
 * WhatsApp, déclenchement du cron — doivent donc exiger un secret partagé pour
 * empêcher un tiers de couper la session WhatsApp ou de lancer des jobs.
 *
 * Le secret est `WORKER_SECRET`, partagé avec le web (server actions) et le
 * cron Railway (header sur la commande curl).
 */

import { EGeneralErrorCode } from '@alertdeals/shared';
import { NextFunction, Request, Response } from 'express';

export function requireWorkerSecret(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = process.env.WORKER_SECRET;

  if (!expected) {
    // Fail-closed : sans secret configuré, on refuse plutôt que d'ouvrir
    // l'endpoint en grand. Mauvaise config = 500, pas un trou de sécurité.
    console.error('[auth] WORKER_SECRET is not set — refusing request');
    res.status(500).json({ error: EGeneralErrorCode.UNKNOWN_ERROR });
    return;
  }

  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token || token !== expected) {
    res.status(401).json({ error: EGeneralErrorCode.UNAUTHORIZED });
    return;
  }

  next();
}
