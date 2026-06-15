import { z } from 'zod';

// Critères de tri du select "Trier par :" sur la liste des hot deals.
// La valeur sérialisée (snake_case) sert de paramètre `?sort=` dans l'URL :
// elle doit rester stable car les URLs partagées entre users en dépendent.
export enum EHotDealsSort {
  DATE_DESC = 'date_desc',
  DATE_ASC = 'date_asc',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  MARGIN_AMOUNT_ASC = 'margin_amount_asc',
  MARGIN_AMOUNT_DESC = 'margin_amount_desc',
  MARGIN_PERCENTAGE_ASC = 'margin_percentage_asc',
  MARGIN_PERCENTAGE_DESC = 'margin_percentage_desc',
}

export const DEFAULT_HOT_DEALS_SORT = EHotDealsSort.DATE_DESC;

// Parse / normalise un paramètre `?sort=` venant de l'URL.
// Tout input invalide (typo, valeur supprimée, etc.) retombe silencieusement
// sur le tri par défaut plutôt que de planter la page.
export const hotDealsSortSchema = z
  .nativeEnum(EHotDealsSort)
  .catch(DEFAULT_HOT_DEALS_SORT);

// Libellés FR affichés dans le <Select> (côté UI uniquement).
export const HOT_DEALS_SORT_LABELS: Record<EHotDealsSort, string> = {
  [EHotDealsSort.DATE_DESC]: 'Plus récentes',
  [EHotDealsSort.DATE_ASC]: 'Plus anciennes',
  [EHotDealsSort.PRICE_ASC]: 'Prix croissants',
  [EHotDealsSort.PRICE_DESC]: 'Prix décroissants',
  [EHotDealsSort.MARGIN_AMOUNT_DESC]: 'Marge décroissante (€)',
  [EHotDealsSort.MARGIN_AMOUNT_ASC]: 'Marge croissante (€)',
  [EHotDealsSort.MARGIN_PERCENTAGE_DESC]: 'Marge décroissante (%)',
  [EHotDealsSort.MARGIN_PERCENTAGE_ASC]: 'Marge croissante (%)',
};

// ────────────────────────────────────────────────────────────────────────────
//                                FILTRES
// ────────────────────────────────────────────────────────────────────────────

// Noms des paramètres dans l'URL. Centralisés ici pour qu'on n'ait pas de
// strings éparpillés "brand" / "model" / ... dans les composants et le service.
export const HOT_DEALS_FILTER_PARAMS = {
  alert: 'alert',
  brand: 'brand',
  model: 'model',
  vehicleState: 'vehicleState',
  hasPhone: 'hasPhone',
} as const;

// Schéma brut tel que reçu dans l'URL : toutes les valeurs sont des strings.
// CSV pour les multi-select (cf. auto-prospect : `?brand=1,2,3` plutôt que
// `?brand=1&brand=2&brand=3`, plus court dans la barre d'adresse).
// `.catch(undefined)` → si l'URL contient n'importe quoi (typo, valeur
// supprimée), on retombe sur "pas de filtre" plutôt que crasher la page.
const csvIntegersSchema = z
  .string()
  .regex(/^\d+(,\d+)*$/, 'Format CSV d\'entiers attendu')
  .catch(undefined as unknown as string);

export const hotDealsFiltersUrlSchema = z.object({
  [HOT_DEALS_FILTER_PARAMS.alert]: z.string().uuid().optional().catch(undefined),
  [HOT_DEALS_FILTER_PARAMS.brand]: csvIntegersSchema.optional(),
  [HOT_DEALS_FILTER_PARAMS.model]: csvIntegersSchema.optional(),
  [HOT_DEALS_FILTER_PARAMS.vehicleState]: csvIntegersSchema.optional(),
  [HOT_DEALS_FILTER_PARAMS.hasPhone]: z.enum(['true', 'false']).optional().catch(undefined),
});

// Forme normalisée passée au service. Les CSVs sont parsés en `number[]`,
// `hasPhone` devient un bool, l'alerte vide devient `null`. C'est ce que le
// service consomme dans son WHERE.
export type THotDealsFilters = {
  alertId: string | null;
  brandIds: number[];
  modelIds: number[];
  vehicleStateIds: number[];
  hasPhone: boolean;
};

export const EMPTY_HOT_DEALS_FILTERS: THotDealsFilters = {
  alertId: null,
  brandIds: [],
  modelIds: [],
  vehicleStateIds: [],
  hasPhone: false,
};

// Helper utilisé par la page (server component) pour transformer le
// `searchParams` Next en filtres typés. Plain object → on supporte aussi bien
// l'objet `await searchParams` que les tests qui passent `{ brand: "1,2" }`.
function parseCsvToInts(csv: string | undefined): number[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
}

export function parseHotDealsFiltersFromSearchParams(
  raw: Record<string, string | string[] | undefined>,
): THotDealsFilters {
  // Next peut renvoyer string[] quand le même param est présent plusieurs fois
  // dans l'URL. Pour les filtres on n'accepte que la 1ère valeur.
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(raw)) {
    flat[k] = Array.isArray(v) ? v[0] : v;
  }

  const parsed = hotDealsFiltersUrlSchema.parse(flat);

  return {
    alertId: parsed.alert ?? null,
    brandIds: parseCsvToInts(parsed.brand),
    modelIds: parseCsvToInts(parsed.model),
    vehicleStateIds: parseCsvToInts(parsed.vehicleState),
    hasPhone: parsed.hasPhone === 'true',
  };
}

// Pratique pour les composants pagination/tri qui doivent savoir s'il y a au
// moins un filtre actif (ex. pour afficher un badge "X filtres actifs").
export function hasAnyHotDealsFilter(filters: THotDealsFilters): boolean {
  return (
    filters.alertId !== null ||
    filters.brandIds.length > 0 ||
    filters.modelIds.length > 0 ||
    filters.vehicleStateIds.length > 0 ||
    filters.hasPhone
  );
}
