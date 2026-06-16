import { Skeleton } from '@/components/ui/skeleton';

export type TVehicleCardSkeletonProps = {
  count?: number;
};

// Skeleton calé sur la silhouette de la carte refondue : image aspect-video
// en haut (sans padding), puis bloc contenu avec titre / prix / meta / pills /
// actions. La carte est `overflow-hidden` avec une bordure pour matcher le
// rendu réel et éviter le "saut" visuel à l'hydratation.
export function VehicleCardSkeleton({ count = 1 }: TVehicleCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-xl border border-white/10 bg-white/5"
        >
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-5 w-3/4" />
            <div className="space-y-1.5">
              <Skeleton className="h-8 w-2/5" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <div className="pt-1">
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
