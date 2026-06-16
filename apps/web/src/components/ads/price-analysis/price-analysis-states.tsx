import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, RefreshCw, SearchX, TriangleAlert } from 'lucide-react';

/** Squelette affiché pendant l'appel (qui peut prendre quelques secondes). */
export function PriceAnalysisLoading() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full">
          <Loader2 className="size-4 animate-spin" />
        </span>
        <div>
          <p className="text-sm font-semibold">Analyse du marché en cours…</p>
          <p className="text-muted-foreground text-sm">
            Comparaison avec les annonces similaires — cela peut prendre quelques secondes.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[120px] rounded-xl" />
      <Skeleton className="h-[300px] rounded-xl" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Pas assez de comparables pour produire une analyse fiable. */
export function PriceAnalysisEmpty({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="grid min-h-[360px] place-items-center p-8 text-center">
      <div className="max-w-md">
        <span className="bg-muted text-muted-foreground mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl">
          <SearchX className="size-7" />
        </span>
        <h3 className="text-lg font-bold">Pas assez d'annonces comparables</h3>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Nous n'avons pas trouvé suffisamment de véhicules similaires pour une analyse
          fiable. Le modèle est peut-être rare, trop récent, ou ses caractéristiques
          incomplètes.
        </p>
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          <RefreshCw className="size-4" />
          Réessayer
        </Button>
      </div>
    </div>
  );
}

/** Le service d'analyse a échoué (API indisponible, etc.). */
export function PriceAnalysisError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="grid min-h-[360px] place-items-center p-8 text-center">
      <div className="max-w-md">
        <span className="bg-destructive/10 text-destructive mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl">
          <TriangleAlert className="size-7" />
        </span>
        <h3 className="text-lg font-bold">L'analyse n'a pas abouti</h3>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{message}</p>
        <Button className="mt-6" onClick={onRetry}>
          <RefreshCw className="size-4" />
          Réessayer
        </Button>
      </div>
    </div>
  );
}
