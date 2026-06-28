import {
  accounts,
  alerts,
  and,
  eq,
  inArray,
  isNotNull,
  lt,
  type TDBAdminClient,
} from '@alertdeals/db';
import { EAlertStatus } from '@alertdeals/shared';

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

  // Update isTrial + pause alerts together so we never end up half-done if the worker
  // crashes between the two writes — would leave accounts in a "trial expired but
  // alerts still firing" state until the next cron run.
  const result = await db.transaction(async (tx) => {
    await tx
      .update(accounts)
      .set({ isTrial: false })
      .where(inArray(accounts.id, accountIds));

    const paused = await tx
      .update(alerts)
      .set({ status: EAlertStatus.PAUSED })
      .where(
        and(
          inArray(alerts.accountId, accountIds),
          eq(alerts.status, EAlertStatus.ACTIVE),
        ),
      )
      .returning({ id: alerts.id });

    return paused.length;
  });

  return { expiredAccounts: expiredAccounts.length, alertsPaused: result };
}
