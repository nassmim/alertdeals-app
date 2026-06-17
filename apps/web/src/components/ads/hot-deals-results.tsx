import { HotDealsEmpty } from '@/components/ads/hot-deals-empty';
import { HotDealsPagination } from '@/components/ads/hot-deals-pagination';
import { VehicleCard } from '@/components/ads/vehicle-card';
import { FREE_AD_QUOTA } from '@/config/premium.config';
import { getCurrentAccountId } from '@/services/account.service';
import { getMatchingAdsPage } from '@/services/ad.service';
import { canCreateAlert } from '@/services/trial.service';
import type { EHotDealsSort, THotDealsFilters } from '@/validation-schemas';

type Props = {
  page: number;
  sort: EHotDealsSort;
  filters: THotDealsFilters;
};

// Région "résultats" isolée dans son propre composant async. La page la monte
// dans un <Suspense key=...> recalé sur page/tri/filtres : au moindre changement
// d'URL, la clé change → le fallback skeleton s'affiche pendant le re-fetch.
// Cela matérialise le chargement (sinon la liste reste figée et l'utilisateur
// croit à un bug). Les filtres et le tri vivent hors de la boundary, donc ils
// restent montés et interactifs pendant le chargement.
export async function HotDealsResults({ page, sort, filters }: Props) {
  const accountId = await getCurrentAccountId();
  // hasFullAccess = abonnement actif OU période d'essai. Les users en trial
  // voient toutes les ads (pas de blur FREE_AD_QUOTA).
  const [hasFullAccess, result] = await Promise.all([
    canCreateAlert(accountId),
    getMatchingAdsPage({ page, sort, filters }),
  ]);

  if (result.kind === 'NO_ALERTS') return <HotDealsEmpty variant="no-alerts" />;
  if (result.kind === 'NO_MATCH') return <HotDealsEmpty variant="no-match" />;

  if (result.ads.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Aucune annonce ne correspond à tes filtres. Essaie d'en retirer ou clique sur Réinitialiser.
      </p>
    );
  }

  return (
    <>
      {/* Grille responsive 1/2/3 colonnes. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {result.ads.map((ad, index) => {
          const isLocked =
            !hasFullAccess && (result.page > 1 || index >= FREE_AD_QUOTA);
          return <VehicleCard key={ad.id} ad={ad} isLocked={isLocked} />;
        })}
      </div>
      <HotDealsPagination page={result.page} totalPages={result.totalPages} />
    </>
  );
}
