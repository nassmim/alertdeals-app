import { CACHE_TAGS } from '@/lib/cache.config';
import { getDBAdminClient } from '@alertdeals/db';
import { cacheTag } from 'next/cache';

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
