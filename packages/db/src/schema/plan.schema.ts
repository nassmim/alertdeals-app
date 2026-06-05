import { InferSelectModel, sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgEnum,
  pgPolicy,
  pgTable,
  smallserial,
  text,
  varchar,
} from 'drizzle-orm/pg-core';
import { authenticatedRole } from 'drizzle-orm/supabase';

// 1 row per Stripe price: a "Mensuel" row + a "Annuel" row both pointing
// at the same Stripe product but at different price_xxx ids.
export const planInterval = pgEnum('plan_interval', ['month', 'year']);

export const plans = pgTable(
  'plans',
  {
    id: smallserial().primaryKey(),
    name: varchar({ length: 100 }).notNull(),
    stripePriceId: varchar('stripe_price_id', { length: 255 }).notNull().unique(),
    priceEur: integer('price_eur').notNull(),
    interval: planInterval().default('month').notNull(),
    description: text(),
    isActive: boolean('is_active').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  () => [
    pgPolicy('enable select for authenticated users', {
      as: 'permissive',
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
);

export type TPlan = InferSelectModel<typeof plans>;
