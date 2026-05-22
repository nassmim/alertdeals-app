import { z } from 'zod';

// Critères de tri du select "Trier par :" sur la liste des hot deals.
// La valeur sérialisée (snake_case) sert de paramètre `?sort=` dans l'URL :
// elle doit rester stable car les URLs partagées entre users en dépendent.
export enum EHotDealsSort {
  DATE_DESC = 'date_desc',
  DATE_ASC = 'date_asc',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  MARGIN_AMOUNT_DESC = 'margin_amount_desc',
  MARGIN_AMOUNT_ASC = 'margin_amount_asc',
  MARGIN_PERCENTAGE_DESC = 'margin_percentage_desc',
  MARGIN_PERCENTAGE_ASC = 'margin_percentage_asc',
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
