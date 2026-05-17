import { VehicleCard } from '@/components/ads/vehicle-card';
import { getRecentAds } from '@/services/ad.service';

const HotDealsPage = async () => {
  const ads = await getRecentAds();

  return (
    <div className="px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Hot Deals</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ads.map((ad) => (
          <VehicleCard key={ad.id} ad={ad} />
        ))}
      </div>
    </div>
  );
};

export default HotDealsPage;
