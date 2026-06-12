import { Skeleton } from '@/components/ui/skeleton';

// Skeleton sœur de la page détail. Reproduit le squelette grossier :
// barre du haut + héro (titre + badges + méta), puis 2 colonnes (galerie
// + caractéristiques à gauche, analyse + CTAs à droite). Sert le LCP
// pendant que la query relationnelle de l'ad charge.
export default function HotDealDetailsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Top bar : juste le bouton retour */}
        <div className="mb-6">
          <Skeleton className="h-8 w-40" />
        </div>

        {/* Héro : titre + badges + méta */}
        <div className="mb-6 space-y-3 sm:mb-8">
          <Skeleton className="h-9 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-28" />
          </div>
          <Skeleton className="h-5 w-1/2" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Gauche : galerie + description + caractéristiques + équipements + contact */}
          <div className="space-y-6">
            <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
            <div className="grid grid-cols-6 gap-2 md:grid-cols-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square w-full rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>

          {/* Droite : analyse + CTAs */}
          <div className="space-y-3">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
