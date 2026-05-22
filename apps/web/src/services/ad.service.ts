import { CACHE_TAGS } from '@/lib/cache.config';
import { getCurrentAccountId } from '@/services/account.service';
import {
  alerts,
  and,
  eq,
  getDBAdminClient,
  matchedAds,
  sql,
} from '@alertdeals/db';
import { EAlertStatus } from '@alertdeals/shared';
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

/**
 * Reads pre-computed matches from `matched_ads` (populated by the worker's
 * daily-orchestrator). Empty states still distinguish "no alerts at all" from
 * "alerts exist but nothing matched yet" so the page can show the right CTA.
 */
async function getCachedMatchingAdsPage(
  accountId: string,
  page: number,
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

  const matchRows = await db.query.matchedAds.findMany({
    where: eq(matchedAds.accountId, accountId),
    orderBy: (table, { desc }) => [desc(table.matchedAt)],
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    with: {
      ad: {
        with: {
          brand: true,
          vehicleModel: true,
          gearBox: true,
          location: true,
        },
      },
    },
  });

  return {
    kind: 'OK',
    ads: matchRows.map((row) => row.ad),
    page,
    totalPages: Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
    totalCount,
  };
}
