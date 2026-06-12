import { VehicleDetails } from '@/components/ads/vehicle-details';
import { getMatchedAdById } from '@/services/ad.service';
import { notFound } from 'next/navigation';

// Next 15+ : `params` est désormais une Promise — on l'await avant d'utiliser.
type Props = {
  params: Promise<{ adId: string }>;
};

// Page détail d'une annonce matched. La résolution d'accès est faite par le
// service : si le compte courant n'a pas de match sur cette ad, on tombe
// sur `null` → 404. Évite toute tentative de bypass du paywall via URL.
const HotDealDetailsPage = async ({ params }: Props) => {
  const { adId } = await params;

  const ad = await getMatchedAdById(adId);
  if (!ad) notFound();

  return <VehicleDetails ad={ad} />;
};

export default HotDealDetailsPage;
