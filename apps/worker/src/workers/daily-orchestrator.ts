import {
  alerts as alertsTable,
  and,
  eq,
  getDBAdminClient,
  matchedAds as matchedAdsTable,
} from '@alertdeals/db';
import { EAlertStatus } from '@alertdeals/shared';
import { Job } from 'bullmq';
import { findMatchedAdIdsForAccount } from '../services/matching.service.js';

interface DailyOrchestratorJob {
  triggeredAt: string;
  source: string;
}

export async function dailyOrchestratorWorker(job: Job<DailyOrchestratorJob>) {
  const startTime = Date.now();
  const db = getDBAdminClient();

  const activeAlerts = await db.query.alerts.findMany({
    where: eq(alertsTable.status, EAlertStatus.ACTIVE),
    with: { location: true },
  });

  if (activeAlerts.length === 0) {
    return { matchedRows: 0, accountsProcessed: 0, durationMs: Date.now() - startTime };
  }

  const alertsByAccount = new Map<string, typeof activeAlerts>();
  for (const alert of activeAlerts) {
    const list = alertsByAccount.get(alert.accountId) ?? [];
    list.push(alert);
    alertsByAccount.set(alert.accountId, list);
  }

  let totalInserted = 0;
  let accountsProcessed = 0;

  for (const [accountId, accountAlerts] of alertsByAccount) {
    accountsProcessed += 1;

    try {
      const matches = await findMatchedAdIdsForAccount(accountAlerts);
      if (matches.length === 0) continue;

      // Dedup by adId — one match row per ad even if multiple alerts hit (unique constraint).
      const seenAdIds = new Set<string>();
      const rowsToInsert: { accountId: string; alertId: string; adId: string }[] = [];
      for (const { adId, alertId } of matches) {
        if (seenAdIds.has(adId)) continue;
        seenAdIds.add(adId);
        rowsToInsert.push({ accountId, alertId, adId });
      }

      const inserted = await db
        .insert(matchedAdsTable)
        .values(rowsToInsert)
        .onConflictDoNothing({
          target: [matchedAdsTable.accountId, matchedAdsTable.adId],
        })
        .returning({ id: matchedAdsTable.id });

      totalInserted += inserted.length;
    } catch (error) {
      console.error(`[daily-orchestrator] failed for account ${accountId}`, error);
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(
    `[daily-orchestrator] processed ${accountsProcessed} accounts, inserted ${totalInserted} new matches in ${durationMs}ms`,
  );

  return { matchedRows: totalInserted, accountsProcessed, durationMs };
}
