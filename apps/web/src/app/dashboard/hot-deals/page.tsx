import { HotDealsEmpty } from '@/components/ads/hot-deals-empty';
import { HotDealsPagination } from '@/components/ads/hot-deals-pagination';
import { HotDealsSortSelect } from '@/components/ads/hot-deals-sort-select';
import { VehicleCard } from '@/components/ads/vehicle-card';
import { FREE_AD_QUOTA } from '@/config/premium.config';
import { getCurrentAccountId } from '@/services/account.service';
import { getMatchingAdsPage } from '@/services/ad.service';
import { hasActiveSubscription } from '@/services/subscription.service';
import { hotDealsSortSchema } from '@/validation-schemas';

type Props = {
  searchParams: Promise<{ page?: string; sort?: string }>;
};

const HotDealsPage = async ({ searchParams }: Props) => {
  const { page: pageParam, sort: sortParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  // `hotDealsSortSchema.catch(DEFAULT)` retombe sur le tri par défaut si la valeur
  // d'URL est manquante ou invalide, on n'a donc pas besoin de gérer ce cas ici.
  const sort = hotDealsSortSchema.parse(sortParam);

  const accountId = await getCurrentAccountId();
  const [isSubscribed, result] = await Promise.all([
    hasActiveSubscription(accountId),
    getMatchingAdsPage({ page, sort }),
  ]);

  return (
    <div className="px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Hot Deals</h1>
        {result.kind === 'OK' && <HotDealsSortSelect value={sort} />}
      </div>

      {result.kind === 'NO_ALERTS' && <HotDealsEmpty variant="no-alerts" />}
      {result.kind === 'NO_MATCH' && <HotDealsEmpty variant="no-match" />}

      {result.kind === 'OK' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.ads.map((ad, index) => {
              const isLocked =
                !isSubscribed && (result.page > 1 || index >= FREE_AD_QUOTA);
              return <VehicleCard key={ad.id} ad={ad} isLocked={isLocked} />;
            })}
          </div>
          <HotDealsPagination page={result.page} totalPages={result.totalPages} sort={sort} />
        </>
      )}
    </div>
  );
};

export default HotDealsPage;
