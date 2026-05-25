import { CACHE_TAGS } from '@/lib/cache.config';
import { getCurrentAccountId } from '@/services/account.service';
import {
  ads,
  alerts,
  and,
  asc,
  desc,
  eq,
  getDBAdminClient,
  inArray,
  matchedAds,
  sql,
} from '@alertdeals/db';
import { EAlertStatus } from '@alertdeals/shared';
import { DEFAULT_HOT_DEALS_SORT, EHotDealsSort } from '@/validation-schemas';
import { cacheTag } from 'next/cache';

// Taille de page utilisée pour la pagination des bonnes affaires (hot-deals).
// 20 = compromis entre temps de chargement et nombre de scrolls user.
const PAGE_SIZE = 20;

/**
 * 20 dernières annonces ingérées, toutes catégories confondues.
 * Cachée à l'échelle globale (pas par account) car la liste est la même pour tout le monde.
 */
async function getCachedRecentAds() {
  'use cache';
  cacheTag(CACHE_TAGS.ads);

  const db = getDBAdminClient();
  return db.query.ads.findMany({
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    limit: 20,
    with: {
      brand: true,
      vehicleModel: true,
      gearBox: true,
      location: true,
    },
  });
}

/**
 * Public wrapper sur le cache : isole les server components du détail "use cache".
 */
export async function getRecentAds() {
  return getCachedRecentAds();
}

// Une annonce avec ses relations chargées (brand, model, gearbox, location).
// Type dérivé pour éviter de redéfinir la forme à la main.
export type TAdWithRelations = Awaited<ReturnType<typeof getRecentAds>>[number];

// 3 états possibles de la page "bonnes affaires" :
//  - NO_ALERTS : l'user n'a aucune alerte active → CTA "créer une alerte"
//  - NO_MATCH  : alertes actives mais 0 match enregistré → "le worker n'a encore rien trouvé"
//  - OK        : on a au moins une page de matches à afficher
export type TMatchingAdsPage =
  | { kind: 'NO_ALERTS' }
  | { kind: 'NO_MATCH' }
  | {
      kind: 'OK';
      ads: TAdWithRelations[];
      page: number;
      totalPages: number;
      totalCount: number;
    };

type TGetMatchingAdsPageParams = {
  page: number;
  sort?: EHotDealsSort;
};

/**
 * Point d'entrée pour la page /dashboard/hot-deals.
 * Délègue au cache une fois l'accountId résolu (sinon le cache serait commun à tous les users).
 */
export async function getMatchingAdsPage(
  params: TGetMatchingAdsPageParams,
): Promise<TMatchingAdsPage> {
  const accountId = await getCurrentAccountId();
  return getCachedMatchingAdsPage(accountId, params.page, params.sort ?? DEFAULT_HOT_DEALS_SORT);
}

/**
 * Reads pre-computed matches from `matched_ads` (populated by the worker's
 * daily-orchestrator). Empty states still distinguish "no alerts at all" from
 * "alerts exist but nothing matched yet" so the page can show the right CTA.
 *
 * Le tri se fait sur les colonnes de `ads` (createdAt, price, marge), ce qui
 * impose un JOIN sur ads dans la 1ère requête. La query relationnelle de
 * Drizzle ne supporte pas l'orderBy sur des tables jointes — on passe donc
 * On rehydrate ensuite les ads avec leurs relations via l'API relationnelle.
 */
async function getCachedMatchingAdsPage(
  accountId: string,
  page: number,
  sort: EHotDealsSort,
): Promise<TMatchingAdsPage> {
  'use cache';
  cacheTag(
    CACHE_TAGS.matchedAdsByAccount(accountId),
    CACHE_TAGS.alertsByAccount(accountId),
  );

  const db = getDBAdminClient();

  const activeAlertsCount = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(alerts)
    .where(and(eq(alerts.accountId, accountId), eq(alerts.status, EAlertStatus.ACTIVE)));

  if ((activeAlertsCount[0]?.count ?? 0) === 0) return { kind: 'NO_ALERTS' };

  const totalRows = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(matchedAds)
    .where(eq(matchedAds.accountId, accountId));

  const totalCount = totalRows[0]?.count ?? 0;
  if (totalCount === 0) return { kind: 'NO_MATCH' };

  // Étape 1 : on récupère les IDs des ads à afficher, déjà triés et paginés,
  // en joignant `ads` pour pouvoir trier par ses colonnes.
  const orderedRows = await db
    .select({ adId: matchedAds.adId })
    .from(matchedAds)
    .innerJoin(ads, eq(matchedAds.adId, ads.id))
    .where(eq(matchedAds.accountId, accountId))
    .orderBy(...buildOrderBy(sort))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const orderedAdIds = orderedRows.map((r) => r.adId);

  if (orderedAdIds.length === 0) {
    return {
      kind: 'OK',
      ads: [],
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
      totalCount,
    };
  }

  // Étape 2 : on rehydrate les ads avec leurs relations via l'API relationnelle.
  // `findMany` ne préserve pas l'ordre de la liste d'IDs → on réordonne en JS via la map.
  const adsWithRelations = await db.query.ads.findMany({
    where: inArray(ads.id, orderedAdIds),
    with: {
      brand: true,
      vehicleModel: true,
      gearBox: true,
      location: true,
    },
  });

  const adsById = new Map(adsWithRelations.map((a) => [a.id, a]));
  const orderedAds = orderedAdIds
    .map((id) => adsById.get(id))
    .filter((a): a is TAdWithRelations => a != null);

  return {
    kind: 'OK',
    ads: orderedAds,
    page,
    totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    totalCount,
  };
}

/**
 * Mapping du critère de tri choisi par l'user vers la clause `ORDER BY`.
 * `NULLS LAST` est utilisé sur les colonnes nullable (marge) pour ne pas faire
 * remonter les ads sans valeur en haut/bas du tri.
 */
function buildOrderBy(sort: EHotDealsSort) {
  switch (sort) {
    case EHotDealsSort.DATE_DESC:
      return [desc(ads.createdAt)];
    case EHotDealsSort.DATE_ASC:
      return [asc(ads.createdAt)];
    case EHotDealsSort.PRICE_ASC:
      return [asc(ads.price)];
    case EHotDealsSort.PRICE_DESC:
      return [desc(ads.price)];
    case EHotDealsSort.MARGIN_AMOUNT_DESC:
      return [sql`${ads.marginAmountMin} DESC NULLS LAST`];
    case EHotDealsSort.MARGIN_AMOUNT_ASC:
      return [sql`${ads.marginAmountMin} ASC NULLS LAST`];
    case EHotDealsSort.MARGIN_PERCENTAGE_DESC:
      return [sql`${ads.marginPercentageMin} DESC NULLS LAST`];
    case EHotDealsSort.MARGIN_PERCENTAGE_ASC:
      return [sql`${ads.marginPercentageMin} ASC NULLS LAST`];
  }
}
