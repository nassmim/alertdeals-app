import {
  accounts,
  alerts,
  and,
  eq,
  inArray,
  subscriptions,
  type TDBAdminClient,
} from '@alertdeals/db';
import { ACTIVE_SUBSCRIPTION_STATUSES, EAlertStatus } from '@alertdeals/shared';

export type TPauseUnsubscribedAlertsResult = {
  accountsPaused: number;
  alertsPaused: number;
};

/**
 * Defensive daily sweep: pauses the ACTIVE alerts of accounts that are neither
 * in trial nor actively subscribed.
 *
 * The Stripe webhook already pauses alerts on `customer.subscription.deleted`,
 * but webhooks can be missed (downtime, misconfiguration) and `past_due`
 * subscriptions never fire a `deleted` event. This sweep is the safety net that
 * guarantees no account keeps receiving notifications without paying.
 *
 * Trial accounts (isTrial = true) are explicitly out of scope — they don't need
 * a subscription; their expiry is handled by expire-trials.service which runs
 * right before this in the daily orchestrator.
 *
 * Idempotent: paused alerts are ignored on rerun.
 */
export async function pauseUnsubscribedAlerts(
  db: TDBAdminClient,
): Promise<TPauseUnsubscribedAlertsResult> {
  // Non-trial accounts that still have at least one ACTIVE alert.
  const candidates = await db
    .selectDistinct({ accountId: alerts.accountId })
    .from(alerts)
    .innerJoin(accounts, eq(alerts.accountId, accounts.id))
    .where(
      and(eq(alerts.status, EAlertStatus.ACTIVE), eq(accounts.isTrial, false)),
    );

  if (candidates.length === 0) {
    return { accountsPaused: 0, alertsPaused: 0 };
  }

  const candidateIds = candidates.map((c) => c.accountId);

  // Among them, keep only those WITHOUT an active subscription.
  const subscribed = await db.query.subscriptions.findMany({
    where: and(
      inArray(subscriptions.accountId, candidateIds),
      inArray(subscriptions.status, ACTIVE_SUBSCRIPTION_STATUSES),
    ),
    columns: { accountId: true },
  });
  const subscribedIds = new Set(subscribed.map((s) => s.accountId));

  const accountIdsToPause = candidateIds.filter((id) => !subscribedIds.has(id));
  if (accountIdsToPause.length === 0) {
    return { accountsPaused: 0, alertsPaused: 0 };
  }

  const paused = await db
    .update(alerts)
    .set({ status: EAlertStatus.PAUSED })
    .where(
      and(
        inArray(alerts.accountId, accountIdsToPause),
        eq(alerts.status, EAlertStatus.ACTIVE),
      ),
    )
    .returning({ id: alerts.id });

  return { accountsPaused: accountIdsToPause.length, alertsPaused: paused.length };
}
