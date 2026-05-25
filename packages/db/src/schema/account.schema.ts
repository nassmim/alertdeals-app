import { InferSelectModel, sql } from 'drizzle-orm';
import { boolean, pgPolicy, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { authenticatedRole, authUid } from 'drizzle-orm/supabase';

export const accounts = pgTable(
  'accounts',
  {
    id: uuid().primaryKey(),
    email: varchar({ length: 320 }).notNull(),
    confirmedByAdmin: boolean('confirmed_by_admin').default(false).notNull(),
    isFirstConnexion: boolean('is_first_connexion').default(true).notNull(),
    // Trial state — written by startTrial() on first connection, read by hasActiveSubscription().
    // Single source of truth for "is the user allowed to use the app right now": this OR an active row in `subscriptions`.
    isInTrial: boolean('is_in_trial').default(false).notNull(),
    trialEndDate: timestamp('trial_end_date', { withTimezone: true }),
    whatsappPhoneNumber: varchar('whatsapp_phone_number', { length: 64 }),
    whatsappIsGroup: boolean('whatsapp_is_group').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    pgPolicy('enable all for account owners', {
      as: 'permissive',
      for: 'all',
      to: authenticatedRole,
      using: sql`${authUid} = ${table.id}`,
      withCheck: sql`${authUid} = ${table.id}`,
    }),
  ],
);

export type TAccount = InferSelectModel<typeof accounts>;

export type TAccountSelectedKeys<
  T extends Partial<Record<keyof TAccount, boolean>>,
> = {
  [K in keyof T]: T[K] extends true ? K : never;
}[keyof T] &
  keyof TAccount;
