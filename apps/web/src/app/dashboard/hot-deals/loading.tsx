import { VehicleCardSkeleton } from '@/components/ads/vehicle-card-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

// Doit rester aligné visuellement sur la page rendue (`hot-deals/page.tsx`) :
// titre + sort à droite, barre "Filtrer" en-dessous, puis grille de cartes.
// Sans le skeleton du sort/filtres, l'utilisateur croyait que ces contrôles
// étaient cassés pendant le chargement (cf. feedback boss).
export default function HotDealsLoading() {
  return (
    <div className="px-4 py-8">
      {/* Ligne titre + sort */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-[260px]" />
      </div>

      {/* Barre "Filtrer" repliée */}
      <div className="mb-6">
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>

      {/* Grille de cartes */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <VehicleCardSkeleton count={6} />
      </div>
    </div>
  );
}
