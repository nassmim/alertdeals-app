import { InferSelectModel, sql } from 'drizzle-orm';
import { pgPolicy, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { authenticatedRole, authUid } from 'drizzle-orm/supabase';
import { accounts } from './account.schema';

// One Stripe customer per account. Kept in its own table (and not on accounts)
// because we never want to touch this row outside of billing webhooks.
export const billingCustomers = pgTable(
  'billing_customers',
  {
    accountId: uuid('account_id')
      .references(() => accounts.id)
      .primaryKey(),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).unique().notNull(),
  },
  (table) => [
    pgPolicy('enable select for billing customer owners', {
      as: 'permissive',
      for: 'select',
      to: authenticatedRole,
      using: sql`${authUid} = ${table.accountId}`,
    }),
  ],
);

export type TBillingCustomer = InferSelectModel<typeof billingCustomers>;
