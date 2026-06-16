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
import {
  DEFAULT_HOT_DEALS_SORT,
  EHotDealsSort,
  EMPTY_HOT_DEALS_FILTERS,
  THotDealsFilters,
} from '@/validation-schemas';
import { cacheTag } from 'next/cache';

const PAGE_SIZE = 20;

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
      // `fuel` est utilisé dans la carte (specs inline : "Électrique",
      // "Essence"…), on l'hydrate dès la liste pour ne pas devoir
      // refetch côté carte.
      fuel: true,
      location: true,
    },
  });
}

export async function getRecentAds() {
  return getCachedRecentAds();
}

export type TAdWithRelations = Awaited<ReturnType<typeof getRecentAds>>[number];

/**
 * Récupère une annonce spécifique avec TOUTES ses relations, à condition
 * que le compte courant ait bien un match sur cette annonce (sécurité :
 * un user ne peut pas voir une ad qui n'est pas dans ses matched_ads,
 * sinon il pourrait contourner le quota free en tapant des UUIDs).
 *
 * Retourne `null` si :
 *   - l'ad n'existe pas
 *   - OU le compte courant n'a pas de match sur cette ad
 *
 * La page détail utilise ce retour pour appeler `notFound()`.
 */
async function getCachedMatchedAdById(accountId: string, adId: string) {
  'use cache';
  cacheTag(
    CACHE_TAGS.matchedAdsByAccount(accountId),
    CACHE_TAGS.adById(adId),
  );

  const db = getDBAdminClient();

  // Étape 1 : vérifier que le compte a bien un match sur cette ad.
  // On ne fait pas confiance à l'URL côté client.
  const match = await db.query.matchedAds.findFirst({
    where: and(eq(matchedAds.accountId, accountId), eq(matchedAds.adId, adId)),
  });

  if (!match) return null;

  // Étape 2 : on rehydrate l'ad avec toutes ses relations utiles pour
  // l'affichage détaillé (type, sous-type, marque, modèle, état, marché,
  // boîte, carburant, permis, places, localisation).
  return db.query.ads.findFirst({
    where: eq(ads.id, adId),
    with: {
      type: true,
      subtype: true,
      brand: true,
      vehicleModel: true,
      vehicleState: true,
      location: true,
      gearBox: true,
      fuel: true,
      marketPosition: true,
      drivingLicence: true,
      vehicleSeats: true,
    },
  });
}

export async function getMatchedAdById(adId: string) {
  const accountId = await getCurrentAccountId();
  return getCachedMatchedAdById(accountId, adId);
}

export type TAdWithFullRelations = NonNullable<
  Awaited<ReturnType<typeof getMatchedAdById>>
>;

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
  filters?: THotDealsFilters;
};

export async function getMatchingAdsPage(
  params: TGetMatchingAdsPageParams,
): Promise<TMatchingAdsPage> {
  const accountId = await getCurrentAccountId();
  return getCachedMatchingAdsPage(
    accountId,
    params.page,
    params.sort ?? DEFAULT_HOT_DEALS_SORT,
    params.filters ?? EMPTY_HOT_DEALS_FILTERS,
  );
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
 *
 * Côté filtres : on garde `NO_MATCH` réservé au cas "aucun match tout court"
 * (compte non filtré). Si l'user a des matchs mais aucun ne passe ses filtres,
 * on renvoie `OK` avec `ads: []` → la page affiche "Aucun résultat" plutôt
 * que la CTA "lance ton premier scrape".
 */
async function getCachedMatchingAdsPage(
  accountId: string,
  page: number,
  sort: EHotDealsSort,
  filters: THotDealsFilters,
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

  // Compte non filtré → permet de distinguer "rien matché jamais" (CTA) de
  // "rien matché AVEC CES FILTRES" (état vide normal).
  const totalRows = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(matchedAds)
    .where(eq(matchedAds.accountId, accountId));

  if ((totalRows[0]?.count ?? 0) === 0) return { kind: 'NO_MATCH' };

  // WHERE clauses cumulatives : on part de la condition de base (matched_ads
  // du compte courant) et on ajoute chaque filtre seulement s'il est renseigné.
  const whereConditions = buildWhereConditions(accountId, filters);

  // Compte filtré → utilisé pour la pagination. Doit refléter le WHERE
  // appliqué sinon on génère des pages vides en fin de pagination.
  const filteredCountRows = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(matchedAds)
    .innerJoin(ads, eq(matchedAds.adId, ads.id))
    .where(and(...whereConditions));

  const filteredCount = filteredCountRows[0]?.count ?? 0;

  if (filteredCount === 0) {
    return {
      kind: 'OK',
      ads: [],
      page,
      totalPages: 1,
      totalCount: 0,
    };
  }

  // Étape 1 : on récupère les IDs des ads à afficher, déjà triés et paginés,
  // en joignant `ads` pour pouvoir trier par ses colonnes ET appliquer les
  // filtres qui portent sur ses colonnes (brand, model, vehicleState, hasPhone).
  const orderedRows = await db
    .select({ adId: matchedAds.adId })
    .from(matchedAds)
    .innerJoin(ads, eq(matchedAds.adId, ads.id))
    .where(and(...whereConditions))
    .orderBy(...buildOrderBy(sort))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const orderedAdIds = orderedRows.map((r) => r.adId);

  if (orderedAdIds.length === 0) {
    return {
      kind: 'OK',
      ads: [],
      page,
      totalPages: Math.max(1, Math.ceil(filteredCount / PAGE_SIZE)),
      totalCount: filteredCount,
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
      // Aligné sur `getCachedRecentAds` : la carte affiche le carburant
      // dans les specs inline.
      fuel: true,
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
    totalPages: Math.max(1, Math.ceil(filteredCount / PAGE_SIZE)),
    totalCount: filteredCount,
  };
}

/**
 * Construit la liste des conditions WHERE en fonction des filtres actifs.
 * Pattern auto-prospect : on n'ajoute la condition QUE si le filtre est
 * renseigné, sinon on retombe sur "pas de contrainte". Renvoyer la liste
 * brute laisse le caller décider de l'opérateur (`and(...)`) et permet de
 * réutiliser pour le count + la query principale.
 */
function buildWhereConditions(accountId: string, filters: THotDealsFilters) {
  const conditions = [eq(matchedAds.accountId, accountId)];

  if (filters.alertId) {
    conditions.push(eq(matchedAds.alertId, filters.alertId));
  }
  if (filters.brandIds.length > 0) {
    conditions.push(inArray(ads.brandId, filters.brandIds));
  }
  if (filters.modelIds.length > 0) {
    conditions.push(inArray(ads.modelId, filters.modelIds));
  }
  if (filters.vehicleStateIds.length > 0) {
    conditions.push(inArray(ads.vehicleStateId, filters.vehicleStateIds));
  }
  if (filters.hasPhone) {
    conditions.push(eq(ads.hasPhone, true));
  }

  return conditions;
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
