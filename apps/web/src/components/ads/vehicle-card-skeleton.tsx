import { Skeleton } from '@/components/ui/skeleton';

export type TVehicleCardSkeletonProps = {
  count?: number;
};

export function VehicleCardSkeleton({ count = 1 }: TVehicleCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl border border-white/10 bg-white/5 p-5">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="mt-4 aspect-video w-full rounded-md" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/5" />
          </div>
          <Skeleton className="mt-4 h-10 w-40 rounded-md" />
        </div>
      ))}
    </>
  );
}
