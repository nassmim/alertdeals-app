// Données référentielles partagées (marques, modèles). Cachées en `weeks` :
// elles changent très rarement et un revalidate trop fréquent serait inutile.
// `getDBAdminClient` est volontaire ici : ces données ne dépendent d'aucun user,
// pas besoin de passer par RLS.
import { CACHE_TAGS } from '@/lib/cache.config';
import { getDBAdminClient } from '@alertdeals/db';
import { cacheLife, cacheTag } from 'next/cache';

/**
 * Liste complète des marques, triées par nom. Utilisée dans les formulaires
 * d'alerte (selects de marques) et les filtres hot-deals.
 */
export async function getBrands() {
  'use cache';
  cacheTag(CACHE_TAGS.brands);
  cacheLife('weeks');

  const db = getDBAdminClient();
  return db.query.brands.findMany({
    orderBy: (table, { asc }) => [asc(table.name)],
  });
}

/**
 * Liste complète des modèles, triés par nom. Le filtrage par marque
 * se fait côté client (chaque modèle porte son `brandId`).
 */
export async function getVehicleModels() {
  'use cache';
  cacheTag(CACHE_TAGS.vehicleModels);
  cacheLife('weeks');

  const db = getDBAdminClient();
  return db.query.vehicleModels.findMany({
    orderBy: (table, { asc }) => [asc(table.name)],
  });
}
