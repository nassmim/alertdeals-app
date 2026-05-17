import { VehicleCardSkeleton } from '@/components/ads/vehicle-card-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function HotDealsLoading() {
  return (
    <div className="px-4 py-8">
      <Skeleton className="mb-6 h-8 w-32" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <VehicleCardSkeleton count={6} />
      </div>
    </div>
  );
}
