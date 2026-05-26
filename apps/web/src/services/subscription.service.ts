import { createDrizzleSupabaseClient } from '@/lib/db';
import {
  accounts,
  and,
  billingCustomers,
  eq,
  getDBAdminClient,
  subscriptions,
  TSubscription,
} from '@alertdeals/db';
import { ACTIVE_SUBSCRIPTION_STATUSES, TRIAL_DURATION_DAYS } from '@alertdeals/shared';

/**
 * Gets the subscription row for an account. Alertdeals has a single plan
 */
export async function getAccountSubscription(
  accountId: string,
): Promise<TSubscription | null> {
  const client = await createDrizzleSupabaseClient();

  const subscription = await client.rls((tx) =>
    tx.query.subscriptions.findFirst({
      where: eq(subscriptions.accountId, accountId),
    }),
  );

  return subscription ?? null;
}

/**
 * True if the account is currently allowed to use paid features —
 * either inside the trial window or with an active Stripe subscription.
 * Single source of truth used to gate the app.
 */
export async function hasActiveSubscription(accountId: string): Promise<boolean> {
  const client = await createDrizzleSupabaseClient();

  const [account, subscription] = await client.rls((tx) =>
    Promise.all([
      tx.query.accounts.findFirst({
        where: eq(accounts.id, accountId),
        columns: { isInTrial: true, trialEndDate: true },
      }),
      tx.query.subscriptions.findFirst({
        where: eq(subscriptions.accountId, accountId),
      }),
    ]),
  );

  // Trial still running wins immediately — no need to check Stripe.
  if (account?.isInTrial && account.trialEndDate && account.trialEndDate > new Date()) {
    return true;
  }

  if (!subscription) return false;

  return ACTIVE_SUBSCRIPTION_STATUSES.includes(
    subscription.status as (typeof ACTIVE_SUBSCRIPTION_STATUSES)[number],
  );
}

/**
 * Returns the Stripe customer ID linked to this account, or null if the user
 * has never been through checkout (first-time customers get one created on first checkout).
 */
export async function getStripeCustomerId(accountId: string): Promise<string | null> {
  const client = await createDrizzleSupabaseClient();

  const result = await client.rls((tx) =>
    tx.query.billingCustomers.findFirst({
      where: eq(billingCustomers.accountId, accountId),
    }),
  );

  return result?.stripeCustomerId ?? null;
}

/**
 * Starts a 15-day trial on first connection.
 *
 * Uses the admin client because:
 *  - It is called from the auth callback before the user's DB session is established;
 *  - The atomic compare-and-swap on isFirstConnexion guarantees idempotence even if the
 *    callback runs twice in parallel (only one update will affect a row).
 */
export async function startTrial(accountId: string): Promise<void> {
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DURATION_DAYS);

  const db = getDBAdminClient();

  await db
    .update(accounts)
    .set({ isFirstConnexion: false, isInTrial: true, trialEndDate })
    .where(and(eq(accounts.id, accountId), eq(accounts.isFirstConnexion, true)));
}
