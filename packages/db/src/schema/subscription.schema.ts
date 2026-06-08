import { InferSelectModel, relations, sql } from 'drizzle-orm';
import { pgPolicy, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { authenticatedRole, authUid } from 'drizzle-orm/supabase';
import { accounts } from './account.schema';

// One row per Stripe subscription. We store stripePriceId so we know which plan
// the user subscribed to — keeps room for multiple plans later without schema changes.
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid().defaultRandom().primaryKey(),
    accountId: uuid('account_id')
      .references(() => accounts.id, { onDelete: 'cascade' })
      .notNull(),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 })
      .unique()
      .notNull(),
    stripePriceId: varchar('stripe_price_id', { length: 255 }).notNull(),
    status: varchar({ length: 50 }).notNull(),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    pgPolicy('enable select for subscription owners', {
      as: 'permissive',
      for: 'select',
      to: authenticatedRole,
      using: sql`${authUid} = ${table.accountId}`,
    }),
  ],
);

export type TSubscription = InferSelectModel<typeof subscriptions>;

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  account: one(accounts, {
    fields: [subscriptions.accountId],
    references: [accounts.id],
  }),
}));
