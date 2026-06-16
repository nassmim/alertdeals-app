import { HotDealsEmpty } from '@/components/ads/hot-deals-empty';
import { HotDealsFilters } from '@/components/ads/hot-deals-filters';
import { HotDealsPagination } from '@/components/ads/hot-deals-pagination';
import { HotDealsSortSelect } from '@/components/ads/hot-deals-sort-select';
import { VehicleCard } from '@/components/ads/vehicle-card';
import { FREE_AD_QUOTA } from '@/config/premium.config';
import { getCurrentAccountId } from '@/services/account.service';
import {
  getBrands,
  getVehicleModels,
  getVehicleStates,
} from '@/services/ad-reference.service';
import { getMatchingAdsPage } from '@/services/ad.service';
import { getAccountAlerts } from '@/services/alert.service';
import { canCreateAlert } from '@/services/trial.service';
import {
  hotDealsSortSchema,
  parseHotDealsFiltersFromSearchParams,
} from '@/validation-schemas';

type Props = {
  // searchParams est volontairement typé large (Record string) parce que les
  // params filtres (`brand`, `model`, etc.) sont parsés via le helper Zod et
  // qu'on ne veut pas dupliquer la liste des keys ici.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const HotDealsPage = async ({ searchParams }: Props) => {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  // `hotDealsSortSchema.catch(DEFAULT)` retombe sur le tri par défaut si la valeur
  // d'URL est manquante ou invalide, on n'a donc pas besoin de gérer ce cas ici.
  const sort = hotDealsSortSchema.parse(params.sort);
  const filters = parseHotDealsFiltersFromSearchParams(params);

  const accountId = await getCurrentAccountId();
  // hasFullAccess = abonnement actif OU période d'essai en cours. Les users en trial
  // voient toutes les ads (pas de blur FREE_AD_QUOTA) puisque le trial sert à
  // démontrer l'expérience payante.
  // Tout fetch en parallèle : query principale (matching ads filtrées),
  // statut d'accès, et référentiels du form de filtres (alertes du compte +
  // brands/models/states). Référentiels cachés `weeks` donc coût négligeable.
  const [hasFullAccess, result, accountAlerts, brands, vehicleModels, vehicleStates] =
    await Promise.all([
      canCreateAlert(accountId),
      getMatchingAdsPage({ page, sort, filters }),
      getAccountAlerts(),
      getBrands(),
      getVehicleModels(),
      getVehicleStates(),
    ]);

  // L'alerte est passée en version "minimale" au filtre (id + name) ; pas la
  // peine d'envoyer toutes les relations (brands/models/location) au client.
  const alertOptions = accountAlerts.map((a) => ({ id: a.id, name: a.name }));

  return (
    <div className="px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Hot Deals</h1>
        {result.kind === 'OK' && <HotDealsSortSelect value={sort} />}
      </div>

      {/* Filtres visibles dès qu'il y a au moins une alerte. Pas la peine de
          montrer un form de filtres à un user qui n'a encore rien créé. */}
      {result.kind !== 'NO_ALERTS' && (
        <div className="mb-6">
          <HotDealsFilters
            initialFilters={filters}
            alerts={alertOptions}
            brands={brands}
            vehicleModels={vehicleModels}
            vehicleStates={vehicleStates}
          />
        </div>
      )}

      {result.kind === 'NO_ALERTS' && <HotDealsEmpty variant="no-alerts" />}
      {result.kind === 'NO_MATCH' && <HotDealsEmpty variant="no-match" />}

      {result.kind === 'OK' && result.ads.length === 0 && (
        <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Aucune annonce ne correspond à tes filtres. Essaie d'en retirer ou clique sur Réinitialiser.
        </p>
      )}

      {result.kind === 'OK' && result.ads.length > 0 && (
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
      )}
    </div>
  );
};

export default HotDealsPage;
