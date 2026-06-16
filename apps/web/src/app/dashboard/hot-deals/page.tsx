import { HotDealsFilters } from '@/components/ads/hot-deals-filters';
import { HotDealsResults } from '@/components/ads/hot-deals-results';
import { HotDealsSortSelect } from '@/components/ads/hot-deals-sort-select';
import {
  getBrands,
  getVehicleModels,
  getVehicleStates,
} from '@/services/ad-reference.service';
import { getAccountAlerts } from '@/services/alert.service';
import {
  hotDealsSortSchema,
  parseHotDealsFiltersFromSearchParams,
} from '@/validation-schemas';
import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';

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

  // Référentiels du form de filtres en parallèle (alertes du compte +
  // brands/models/states). Cachés `weeks` donc coût négligeable. La liste des
  // ads (dynamique, lente) est fetchée à part, dans <HotDealsResults> sous
  // Suspense, pour pouvoir afficher un loader pendant son chargement.
  const [accountAlerts, brands, vehicleModels, vehicleStates] = await Promise.all([
    getAccountAlerts(),
    getBrands(),
    getVehicleModels(),
    getVehicleStates(),
  ]);

  // L'alerte est passée en version "minimale" au filtre (id + name) ; pas la
  // peine d'envoyer toutes les relations (brands/models/location) au client.
  const alertOptions = accountAlerts.map((a) => ({ id: a.id, name: a.name }));
  const hasAlerts = alertOptions.length > 0;

  // Clé du boundary Suspense : tout changement de page/tri/filtres la modifie,
  // ce qui force le remount de <HotDealsResults> → affichage du loader pendant
  // le re-fetch. Les filtres et le tri restent hors de la boundary, donc montés
  // et interactifs pendant le chargement.
  const resultsKey = JSON.stringify({ page, sort, filters });

  return (
    <div className="px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Hot Deals</h1>
        {hasAlerts && <HotDealsSortSelect value={sort} />}
      </div>

      {/* Filtres visibles dès qu'il y a au moins une alerte. Pas la peine de
          montrer un form de filtres à un user qui n'a encore rien créé. */}
      {hasAlerts && (
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

      <Suspense
        key={resultsKey}
        fallback={
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            Chargement des annonces…
          </div>
        }
      >
        <HotDealsResults page={page} sort={sort} filters={filters} />
      </Suspense>
    </div>
  );
};

export default HotDealsPage;
