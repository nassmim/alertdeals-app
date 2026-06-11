// Fail fast at boot: a missing MYTRACKS_API_KEY is always a misconfiguration,
// never a recoverable runtime condition (même pattern que stripe.ts).
if (!process.env.MYTRACKS_API_KEY) {
  throw new Error('MYTRACKS_API_KEY is not set');
}

const apiKey = process.env.MYTRACKS_API_KEY;
const MYTRACKS_BASE_URL = 'https://api.mytracks.fr/v1';

/**
 * Paramètres obligatoires de l'endpoint payant `/analyse-flex`. Tous les champs
 * sont requis par l'API (sinon 422). Les valeurs acceptées pour `fuel_type` et
 * `vehicle_type` sont contraintes côté mytracks — on envoie nos libellés tels
 * quels et on retombe sur des valeurs par défaut côté service si une donnée
 * manque dans notre base.
 */
export type TAnalyseFlexParams = {
  brand: string;
  model_name: string;
  fuel_type: string;
  gearbox_type: string;
  year: number;
  doors: number;
  seats: number;
  horsepower: number;
  horse_power_din: number;
  mileage: number;
  vehicle_type: string;
};

/** Une annonce comparable renvoyée dans `points` (champs utiles seulement). */
export type TMyTracksPoint = {
  ad_id: number;
  similarity: number;
  year: number | null;
  price: number | null;
  mileage: number | null;
  owner_type: string | null;
  horse_power_din: number | null;
  first_publication_date: string | null;
  first_deactivated_date: string | null;
};

/** Réponse brute de `/analyse-flex` (champs consommés par notre transformation). */
export type TMyTracksAnalyseFlex = {
  similarity_min: number | null;
  count: number | null;
  temps_vente: number | null;
  vehicle_prediction: { prediction: number | null; version: string } | null;
  points: TMyTracksPoint[];
};

/**
 * Lance une analyse marché pour un véhicule. Appel payant (0,49 €) — réservé au
 * cas "pas encore en cache" côté service. `cache: 'no-store'` garantit qu'on ne
 * sert jamais une réponse mémorisée par la couche fetch à la place du cache BDD.
 */
export async function fetchAnalyseFlex(
  params: TAnalyseFlexParams,
): Promise<TMyTracksAnalyseFlex> {
  const query = new URLSearchParams({
    brand: params.brand,
    model_name: params.model_name,
    fuel_type: params.fuel_type,
    gearbox_type: params.gearbox_type,
    year: String(params.year),
    doors: String(params.doors),
    seats: String(params.seats),
    horsepower: String(params.horsepower),
    horse_power_din: String(params.horse_power_din),
    mileage: String(params.mileage),
    vehicle_type: params.vehicle_type,
  });

  const response = await fetch(`${MYTRACKS_BASE_URL}/analyse-flex?${query.toString()}`, {
    headers: { 'X-API-Key': apiKey },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`mytracks analyse-flex failed with status ${response.status}`);
  }

  return response.json() as Promise<TMyTracksAnalyseFlex>;
}
