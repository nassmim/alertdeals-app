import {
  accounts,
  alerts,
  and,
  eq,
  inArray,
  isNotNull,
  lt,
  subscriptions,
  type TDBAdminClient,
} from '@alertdeals/db';
import { ACTIVE_SUBSCRIPTION_STATUSES, EAlertStatus } from '@alertdeals/shared';

export type TExpireTrialsResult = {
  expiredAccounts: number;
  alertsPaused: number;
};

/**
 * Daily housekeeping for expired trials.
 *
 * Finds accounts whose 3-day trial countdown has elapsed and:
 *  1. Flips `isTrial` to false (so the gate in alert.actions blocks further creates/activates).
 *  2. Pauses all their currently-active alerts (per spec — no more notifications until they subscribe).
 *
 * Accounts that subscribed DURING their trial are exempt from step 2: nothing sets
 * `isTrial` to false at checkout, so without this exemption a paying user would get
 * their alerts paused when the 3-day window lapses. `isTrial` is still flipped for
 * them (harmless — the web gate checks the subscription first).
 *
 * Idempotent: an already-expired account whose alerts are all paused is a no-op on rerun.
 * Called from the daily orchestrator BEFORE matching so paused alerts don't get processed.
 */
export async function expireTrials(db: TDBAdminClient): Promise<TExpireTrialsResult> {
  const now = new Date();

  const expiredAccounts = await db.query.accounts.findMany({
    where: and(
      eq(accounts.isTrial, true),
      isNotNull(accounts.trialEndDate),
      lt(accounts.trialEndDate, now),
    ),
    columns: { id: true },
  });

  if (expiredAccounts.length === 0) {
    return { expiredAccounts: 0, alertsPaused: 0 };
  }

  const accountIds = expiredAccounts.map((a) => a.id);

  // Users who subscribed during their trial keep their alerts running —
  // only the non-subscribed expired accounts get paused below.
  const subscribed = await db.query.subscriptions.findMany({
    where: and(
      inArray(subscriptions.accountId, accountIds),
      inArray(subscriptions.status, ACTIVE_SUBSCRIPTION_STATUSES),
    ),
    columns: { accountId: true },
  });
  const subscribedIds = new Set(subscribed.map((s) => s.accountId));
  const accountIdsToPause = accountIds.filter((id) => !subscribedIds.has(id));

  // Update isTrial + pause alerts together so we never end up half-done if the worker
  // crashes between the two writes — would leave accounts in a "trial expired but
  // alerts still firing" state until the next cron run.
  const result = await db.transaction(async (tx) => {
    await tx
      .update(accounts)
      .set({ isTrial: false })
      .where(inArray(accounts.id, accountIds));

    if (accountIdsToPause.length === 0) return 0;

    const paused = await tx
      .update(alerts)
      .set({ status: EAlertStatus.PAUSED })
      .where(
        and(
          inArray(alerts.accountId, accountIdsToPause),
          eq(alerts.status, EAlertStatus.ACTIVE),
        ),
      )
      .returning({ id: alerts.id });

    return paused.length;
  });

  return { expiredAccounts: expiredAccounts.length, alertsPaused: result };
}
