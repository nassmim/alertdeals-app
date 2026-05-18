import { CACHE_TAGS } from '@/lib/cache.config';
import { getCurrentAccountId } from '@/services/account.service';
import {
  ads,
  alerts,
  and,
  eq,
  getDBAdminClient,
  gte,
  inArray,
  locations,
  lte,
  or,
  sql,
  type SQL,
} from '@alertdeals/db';
import { EAlertMode, EAlertStatus } from '@alertdeals/shared';
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
      location: true,
    },
  });
}

export async function getRecentAds() {
  return getCachedRecentAds();
}

export type TAdWithRelations = Awaited<ReturnType<typeof getRecentAds>>[number];

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

export async function getMatchingAdsPage(params: { page: number }): Promise<TMatchingAdsPage> {
  const accountId = await getCurrentAccountId();
  return getCachedMatchingAdsPage(accountId, params.page);
}

async function getCachedMatchingAdsPage(
  accountId: string,
  page: number,
): Promise<TMatchingAdsPage> {
  'use cache';
  cacheTag(
    CACHE_TAGS.matchedAdsByAccount(accountId),
    CACHE_TAGS.ads,
    CACHE_TAGS.alertsByAccount(accountId),
  );

  const db = getDBAdminClient();

  const userAlerts = await db.query.alerts.findMany({
    where: and(eq(alerts.accountId, accountId), eq(alerts.status, EAlertStatus.ACTIVE)),
    with: { location: true },
  });

  if (userAlerts.length === 0) return { kind: 'NO_ALERTS' };

  const alertConditions: SQL[] = [];
  for (const alert of userAlerts) {
    const conditions: SQL[] = [];

    if (alert.brandId != null) conditions.push(eq(ads.brandId, alert.brandId));
    if (alert.modelId != null) conditions.push(eq(ads.modelId, alert.modelId));
    if (alert.modelYearMin != null) conditions.push(gte(ads.modelYear, alert.modelYearMin));
    if (alert.modelYearMax != null) conditions.push(lte(ads.modelYear, alert.modelYearMax));
    if (alert.mileageMin != null) conditions.push(gte(ads.mileage, alert.mileageMin));
    if (alert.mileageMax != null) conditions.push(lte(ads.mileage, alert.mileageMax));
    if (alert.priceMin != null) conditions.push(gte(ads.price, alert.priceMin));

    if (alert.mode === EAlertMode.PRICE_MAX && alert.priceMax != null) {
      conditions.push(lte(ads.price, alert.priceMax));
    } else if (alert.mode === EAlertMode.MARGIN_MIN && alert.marginMinPercentage != null) {
      conditions.push(gte(ads.marginPercentageMin, alert.marginMinPercentage / 100));
    }

    if (alert.location && alert.radiusInKm != null && alert.radiusInKm > 0) {
      const nearbyIds = await getLocationIdsWithinRadius(
        alert.location.lat,
        alert.location.lng,
        alert.radiusInKm,
      );
      if (nearbyIds.length === 0) continue;
      conditions.push(inArray(ads.locationId, nearbyIds));
    }

    if (conditions.length > 0) alertConditions.push(and(...conditions)!);
  }

  if (alertConditions.length === 0) return { kind: 'NO_MATCH' };

  const where = or(...alertConditions);

  const [totalRows, pageRows] = await Promise.all([
    db.select({ count: sql<number>`cast(count(*) as integer)` }).from(ads).where(where),
    db.query.ads.findMany({
      where,
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      with: {
        brand: true,
        vehicleModel: true,
        gearBox: true,
        location: true,
      },
    }),
  ]);

  const totalCount = totalRows[0]?.count ?? 0;
  if (totalCount === 0) return { kind: 'NO_MATCH' };

  return {
    kind: 'OK',
    ads: pageRows,
    page,
    totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    totalCount,
  };
}

async function getLocationIdsWithinRadius(
  lat: number,
  lng: number,
  radiusInKm: number,
): Promise<number[]> {
  const db = getDBAdminClient();
  const rows = await db.query.locations.findMany({
    where: sql`ST_DWithin(
      ST_MakePoint(${locations.lng}, ${locations.lat})::geography,
      ST_MakePoint(${lng}, ${lat})::geography,
      ${radiusInKm * 1000}
    )`,
    columns: { id: true },
  });
  return rows.map((r) => r.id);
}
