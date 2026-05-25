import { CACHE_TAGS } from '@/lib/cache.config';
import { getCurrentAccountId } from '@/services/account.service';
import { alerts, and, eq, getDBAdminClient } from '@alertdeals/db';
import { EAlertErrorCode } from '@alertdeals/shared';
import { cacheTag } from 'next/cache';

// Hydratation standard d'une alerte : on charge systématiquement
// les join tables brands/models + la location pour affichage.
// `as const` pour préserver la forme exacte dans le typage Drizzle.
const ALERT_WITH = {
  brands: { with: { brand: true } },
  models: { with: { vehicleModel: true } },
  location: true,
} as const;

/**
 * Toutes les alertes d'un compte, triées par date de création décroissante.
 * Cachée par accountId : la query change si l'user crée/modifie une alerte
 * (invalidation déclenchée dans `alert.actions.ts` via `updateTag`).
 */
async function getCachedAccountAlerts(accountId: string) {
  'use cache';
  cacheTag(CACHE_TAGS.alertsByAccount(accountId));

  const db = getDBAdminClient();
  return db.query.alerts.findMany({
    where: eq(alerts.accountId, accountId),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    with: ALERT_WITH,
  });
}

/**
 * Wrapper public : résout l'accountId puis délègue au cache.
 * Le split est nécessaire car `getCurrentAccountId` lit le JWT et ne peut
 * pas vivre dans un bloc `'use cache'`.
 */
export async function getAccountAlerts() {
  const accountId = await getCurrentAccountId();
  return getCachedAccountAlerts(accountId);
}

/**
 * Charge une alerte spécifique. Le `where` inclut `accountId` pour bloquer
 * l'accès cross-account (defense-in-depth en plus du RLS).
 * Throw ALERT_NOT_FOUND si introuvable — pas de retour null.
 */
async function getCachedAlertById(alertId: string, accountId: string) {
  'use cache';
  cacheTag(CACHE_TAGS.alert(alertId), CACHE_TAGS.alertsByAccount(accountId));

  const db = getDBAdminClient();
  const alert = await db.query.alerts.findFirst({
    where: and(eq(alerts.id, alertId), eq(alerts.accountId, accountId)),
    with: ALERT_WITH,
  });

  if (!alert) throw new Error(EAlertErrorCode.ALERT_NOT_FOUND);
  return alert;
}

/**
 * Wrapper public sur le cache, voir `getAccountAlerts`.
 */
export async function getAlertById(alertId: string) {
  const accountId = await getCurrentAccountId();
  return getCachedAlertById(alertId, accountId);
}

export type TAccountAlert = Awaited<ReturnType<typeof getAccountAlerts>>[number];
