import { InferSelectModel, relations, sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  pgPolicy,
  pgTable,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { authenticatedRole, authUid } from 'drizzle-orm/supabase';
import { accounts } from './account.schema';
import { ads } from './ad.schema';
import { alerts } from './alert.schema';

export const matchedAds = pgTable(
  'matched_ads',
  {
    id: uuid().defaultRandom().primaryKey(),
    accountId: uuid('account_id').notNull(),
    alertId: uuid('alert_id'),
    adId: uuid('ad_id').notNull(),
    matchedAt: timestamp('matched_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.accountId],
      foreignColumns: [accounts.id],
      name: 'matched_ad_account_id_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.alertId],
      foreignColumns: [alerts.id],
      name: 'matched_ad_alert_id_fk',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.adId],
      foreignColumns: [ads.id],
      name: 'matched_ad_ad_id_fk',
    }).onDelete('cascade'),
    unique('matched_ads_account_id_ad_id_key').on(table.accountId, table.adId),
    index('matched_ads_account_id_idx').on(table.accountId),
    index('matched_ads_matched_at_idx').on(table.matchedAt),
    pgPolicy('enable read for account owner', {
      as: 'permissive',
      for: 'select',
      to: authenticatedRole,
      using: sql`${table.accountId} = ${authUid}`,
    }),
  ],
);

export const matchedAdsRelations = relations(matchedAds, ({ one }) => ({
  account: one(accounts, { fields: [matchedAds.accountId], references: [accounts.id] }),
  alert: one(alerts, { fields: [matchedAds.alertId], references: [alerts.id] }),
  ad: one(ads, { fields: [matchedAds.adId], references: [ads.id] }),
}));

export type TMatchedAd = InferSelectModel<typeof matchedAds>;
