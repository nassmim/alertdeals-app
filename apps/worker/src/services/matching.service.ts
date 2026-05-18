import {
  ads,
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
  type TAlert,
  type TLocation,
} from '@alertdeals/db';
import { EAlertMode } from '@alertdeals/shared';

type AlertWithLocation = TAlert & { location: TLocation | null };

export type TMatchedAdRow = { adId: string; alertId: string };

export async function findMatchedAdIdsForAccount(
  alertsForAccount: AlertWithLocation[],
): Promise<TMatchedAdRow[]> {
  if (alertsForAccount.length === 0) return [];

  const db = getDBAdminClient();
  const results: TMatchedAdRow[] = [];

  for (const alert of alertsForAccount) {
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
      // User enters a percentage point value (e.g. 15 for 15%); ad stores a fraction (0.15).
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

    if (conditions.length === 0) continue;

    const matchedAds = await db.query.ads.findMany({
      where: and(...conditions),
      columns: { id: true },
    });

    for (const ad of matchedAds) {
      results.push({ adId: ad.id, alertId: alert.id });
    }
  }

  return results;
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
