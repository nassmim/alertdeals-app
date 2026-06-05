import { createDrizzleSupabaseClient } from '@/lib/db';
import { billingCustomers, eq, subscriptions, TSubscription } from '@alertdeals/db';
import { ACTIVE_SUBSCRIPTION_STATUSES } from '@alertdeals/shared';

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
 * True if the account currently has an active Stripe subscription
 * (one of ACTIVE_SUBSCRIPTION_STATUSES). Single source of truth used to gate paid features.
 */
export async function hasActiveSubscription(accountId: string): Promise<boolean> {
  const client = await createDrizzleSupabaseClient();

  const subscription = await client.rls((tx) =>
    tx.query.subscriptions.findFirst({
      where: eq(subscriptions.accountId, accountId),
    }),
  );

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
