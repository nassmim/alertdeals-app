import { InferInsertModel, InferSelectModel, relations, sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { authenticatedRole, authUid } from 'drizzle-orm/supabase';
import { accounts } from './account.schema';

// Abonnements Web Push : un par navigateur/appareil ayant autorisé les
// notifications pour un compte. Le client s'abonne via l'API PushManager et
// persiste l'`endpoint` + les clés de chiffrement ici (server action). Le worker
// lit ces lignes (client admin) pour pousser les notifs de match d'alerte.
export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid().defaultRandom().primaryKey(),
    accountId: uuid('account_id').notNull(),
    // URL unique du service de push du navigateur (FCM, Mozilla…). Peut être
    // longue → `text` plutôt que `varchar`.
    endpoint: text().notNull(),
    // Clé publique du client (courbe P-256) servant à chiffrer le payload.
    p256dh: text().notNull(),
    // Secret d'authentification du client, également requis par le protocole.
    auth: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.accountId],
      foreignColumns: [accounts.id],
      name: 'push_subscription_account_id_fk',
    }).onDelete('cascade'),
    // Un endpoint donné ne doit exister qu'une fois par compte — rend l'upsert
    // idempotent quand un même appareil se ré-abonne (clés renouvelées).
    unique('push_subscription_account_id_endpoint_key').on(
      table.accountId,
      table.endpoint,
    ),
    index('push_subscription_account_id_idx').on(table.accountId),
    // Le propriétaire gère ses propres abonnements (insert/select/delete). Le
    // worker lit hors RLS via le client admin lors du dispatch des notifs.
    pgPolicy('enable all for the subscription owners', {
      as: 'permissive',
      for: 'all',
      to: authenticatedRole,
      using: sql`${table.accountId} = ${authUid}`,
      withCheck: sql`${table.accountId} = ${authUid}`,
    }),
  ],
);

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  account: one(accounts, {
    fields: [pushSubscriptions.accountId],
    references: [accounts.id],
  }),
}));

export type TPushSubscription = InferSelectModel<typeof pushSubscriptions>;
export type TPushSubscriptionInsert = Omit<
  InferInsertModel<typeof pushSubscriptions>,
  'id' | 'createdAt'
>;
