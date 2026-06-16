import { InferSelectModel, relations, sql } from 'drizzle-orm';
import {
  foreignKey,
  index,
  jsonb,
  pgPolicy,
  pgTable,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { authenticatedRole } from 'drizzle-orm/supabase';
import { ads } from './ad.schema';

/**
 * Cache des analyses tarifaires avancées (endpoint payant mytracks /analyse-flex).
 *
 * Le cache est porté par l'ANNONCE, pas par le compte : une même annonce vaut la
 * même analyse marché quel que soit l'utilisateur qui la consulte. On stocke donc
 * UNE ligne par `adId` (contrainte unique) pour ne jamais repayer deux fois la
 * même requête. La réponse brute mytracks est conservée telle quelle en `jsonb`
 * (`payload`) : on garde toute l'info renvoyée et on la transforme à la lecture.
 */
export const priceAnalyses = pgTable(
  'price_analyses',
  {
    id: uuid().defaultRandom().primaryKey(),
    adId: uuid('ad_id').notNull(),
    payload: jsonb().$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.adId],
      foreignColumns: [ads.id],
      name: 'price_analysis_ad_id_fk',
    }).onDelete('cascade'),
    unique('price_analyses_ad_id_key').on(table.adId),
    index('price_analyses_ad_id_idx').on(table.adId),
    // Lecture : toute l'app authentifiée partage ce cache marché (donnée non sensible).
    pgPolicy('enable read for authenticated users', {
      as: 'permissive',
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
    // Écriture : la 1ère consultation d'une annonce alimente le cache partagé.
    pgPolicy('enable insert for authenticated users', {
      as: 'permissive',
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`true`,
    }),
  ],
);

export const priceAnalysesRelations = relations(priceAnalyses, ({ one }) => ({
  ad: one(ads, { fields: [priceAnalyses.adId], references: [ads.id] }),
}));

export type TPriceAnalysis = InferSelectModel<typeof priceAnalyses>;
