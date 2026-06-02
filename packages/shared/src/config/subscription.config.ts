// Single source of truth for subscription statuses.
export const ESubscriptionStatus = {
  ACTIVE: 'active',
  CANCELED: 'canceled',
  PAST_DUE: 'past_due',
} as const;

export type TSubscriptionStatus = (typeof ESubscriptionStatus)[keyof typeof ESubscriptionStatus];

// Statuses that grant access to the app. Kept as an array (not a single value)
// because later we may want to grant access on `past_due` for a grace period.
export const ACTIVE_SUBSCRIPTION_STATUSES: TSubscriptionStatus[] = [ESubscriptionStatus.ACTIVE];
