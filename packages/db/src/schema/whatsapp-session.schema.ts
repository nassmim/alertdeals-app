import { InferSelectModel, sql } from 'drizzle-orm';
import { boolean, pgPolicy, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { authenticatedRole } from 'drizzle-orm/supabase';

// Singleton table : utilise UN SEUL numéro WhatsApp central pour
// envoyer les notifs à tous les users. On force donc une seule row via une PK
// `text` à valeur fixe ('alertdeals') — la contrainte d'unicité de la PK
// empêche un second insert accidentel.
//
export const whatsappSessions = pgTable(
  'whatsapp_sessions',
  {
    id: text().primaryKey().default('alertdeals'),
    // JSON encrypté (AES-256-GCM) contenant `{ creds, keys }` au format Baileys.
    // Encrypté avec WHATSAPP_ENCRYPTION_KEY pour ne jamais stocker en clair.
    credentials: text(),
    isConnected: boolean('is_connected').default(false).notNull(),
    isDisconnected: boolean('is_disconnected').default(false).notNull(),
    lastConnectedAt: timestamp('last_connected_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  () => [
    // Aucune row n'est exposée au client : la session est gérée uniquement par
    // le worker (admin client). On refuse tout accès depuis le rôle authentifié.
    pgPolicy('deny all access (admin only)', {
      as: 'permissive',
      for: 'all',
      to: authenticatedRole,
      using: sql`false`,
      withCheck: sql`false`,
    }),
  ],
);

export type TWhatsappSession = InferSelectModel<typeof whatsappSessions>;
