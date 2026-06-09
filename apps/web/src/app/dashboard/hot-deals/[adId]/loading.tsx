import { Skeleton } from '@/components/ui/skeleton';

// Skeleton sœur de la page détail. Reproduit le squelette grossier :
// barre top, bloc héro (badges + titre + méta), puis 2 colonnes
// (galerie + description à gauche, prix sticky + contact à droite).
// Sert le LCP visuel pendant que la query relationnelle de l'ad charge.
export default function HotDealDetailsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Top bar : retour + analyse avancée */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-40" />
        </div>

        {/* Bloc héro : badges + titre + méta */}
        <div className="mb-6 space-y-3 sm:mb-8">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
          {/* Colonne gauche : grosse image + description + caractéristiques */}
          <div className="space-y-6">
            <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>

          {/* Colonne droite : prix + contact */}
          <div className="space-y-4">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
