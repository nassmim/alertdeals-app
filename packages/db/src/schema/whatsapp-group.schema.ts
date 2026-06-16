import { InferInsertModel, InferSelectModel, relations, sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  pgPolicy,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { authenticatedRole, authUid } from 'drizzle-orm/supabase';
import { accounts } from './account.schema';

// Groupes WhatsApp détectés automatiquement quand le numéro central AlertDeals
// est ajouté à un groupe. Le worker écoute l'event Baileys
// `group-participants.update`, relie le groupe au compte via le numéro de la
// personne qui nous a ajoutés (`addedBy` = whatsappPhoneNumber du user), et
// upsert ici. Évite à l'utilisateur de coller manuellement le groupId.
export const whatsappGroups = pgTable(
  'whatsapp_groups',
  {
    id: uuid().defaultRandom().primaryKey(),
    accountId: uuid('account_id').notNull(),
    // JID complet du groupe renvoyé par Baileys, ex. "120363...@g.us".
    groupId: varchar('group_id', { length: 128 }).notNull(),
    // Nom du groupe au moment de la détection (peut évoluer côté WhatsApp).
    groupName: varchar('group_name', { length: 255 }),
    // Numéro de la personne qui a ajouté notre bot (event `author`) — c'est la
    // clé de liaison avec `accounts.whatsappPhoneNumber`.
    addedBy: varchar('added_by', { length: 64 }),
    detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.accountId],
      foreignColumns: [accounts.id],
      name: 'whatsapp_group_account_id_fk',
    }).onDelete('cascade'),
    // Un même groupe ne doit être enregistré qu'une fois par compte — rend
    // l'upsert idempotent si l'event est rejoué (reconnexion du socket).
    unique('whatsapp_group_account_id_group_id_key').on(table.accountId, table.groupId),
    index('whatsapp_group_account_id_idx').on(table.accountId),
    // Lecture/suppression réservées au propriétaire. L'écriture vient du worker
    // (client admin, hors RLS) lors de la détection, donc pas de policy insert.
    pgPolicy('enable read and delete for the group owners', {
      as: 'permissive',
      for: 'all',
      to: authenticatedRole,
      using: sql`${table.accountId} = ${authUid}`,
      withCheck: sql`${table.accountId} = ${authUid}`,
    }),
  ],
);

export const whatsappGroupsRelations = relations(whatsappGroups, ({ one }) => ({
  account: one(accounts, {
    fields: [whatsappGroups.accountId],
    references: [accounts.id],
  }),
}));

export type TWhatsappGroup = InferSelectModel<typeof whatsappGroups>;
export type TWhatsappGroupInsert = Omit<
  InferInsertModel<typeof whatsappGroups>,
  'id' | 'detectedAt'
>;
