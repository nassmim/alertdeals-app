import { createDrizzleSupabaseClient } from '@/lib/db';
import {
  fetchAnalyseFlex,
  type TAnalyseFlexParams,
  type TMyTracksAnalyseFlex,
} from '@/lib/mytracks';
import { ads, eq, priceAnalyses } from '@alertdeals/db';
import { EPriceAnalysisErrorCode } from '@alertdeals/shared';

// Valeurs de repli pour les champs requis par mytracks mais absents de notre
// table `ads`. Décision produit assumée : l'estimation reste pertinente car elle
// s'appuie surtout sur marque/modèle/année/kilométrage/puissance DIN.
const DEFAULT_FUEL_TYPE = 'Essence';
const DEFAULT_GEARBOX_TYPE = 'Manuelle';
const DEFAULT_VEHICLE_TYPE = 'Citadine';
const DEFAULT_DOORS = 5;
const DEFAULT_SEATS = 5;
const DEFAULT_FISCAL_HP = 5; // puissance fiscale (CV) — non stockée chez nous
const DEFAULT_DIN_HP = 90; // repli si l'annonce n'a pas de puissance DIN

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Une annonce comparable, normalisée pour l'affichage. */
export type TPriceAnalysisPoint = {
  id: number;
  price: number;
  mileage: number;
  year: number;
  sim: number;
  owner: 'pro' | 'priv';
  ageDays: number;
  hp: number | null;
  sold: boolean;
};

/** Statistiques agrégées du marché pour le véhicule analysé. */
export type TPriceAnalysisStats = {
  brand: string;
  model: string;
  yearMode: number | null;
  hp: number | null;
  prediction: number | null;
  count: number;
  tempsVente: number | null;
  similarityMin: number | null;
  priceMin: number;
  priceMedian: number;
  priceMax: number;
  proCount: number;
  privCount: number;
};

export type TPriceAnalysisView = {
  annoncePrice: number;
  stats: TPriceAnalysisStats;
  points: TPriceAnalysisPoint[];
};

/**
 * Résultat discriminé (même style que `TMatchingAdsPage` dans ad.service) :
 * - OK    : analyse exploitable
 * - EMPTY : pas assez de comparables, ou identité véhicule insuffisante
 * Les erreurs (annonce introuvable, échec API) sont remontées via `throw` d'un
 * code connu, capturé par l'action.
 */
export type TPriceAnalysisResult =
  | { kind: 'OK'; analysis: TPriceAnalysisView }
  | { kind: 'EMPTY' };

/**
 * Cœur de la feature : on cherche d'abord l'analyse en base (cache partagé par
 * annonce). On ne déclenche l'appel payant mytracks QUE si aucune analyse n'existe
 * encore pour cette annonce, puis on persiste la réponse pour les consultations
 * suivantes.
 */
export async function getOrCreatePriceAnalysis(
  adId: string,
): Promise<TPriceAnalysisResult> {
  const db = await createDrizzleSupabaseClient();

  // On charge l'annonce avec les relations nécessaires à la requête mytracks.
  const ad = await db.rls((tx) =>
    tx.query.ads.findFirst({
      where: eq(ads.id, adId),
      with: {
        brand: true,
        vehicleModel: true,
        fuel: true,
        gearBox: true,
        vehicleSeats: true,
      },
    }),
  );

  if (!ad) throw new Error(EPriceAnalysisErrorCode.AD_NOT_FOUND);

  // 1) Cache BDD : si l'annonce a déjà été analysée, on ne repaie rien.
  const cached = await db.rls((tx) =>
    tx.query.priceAnalyses.findFirst({ where: eq(priceAnalyses.adId, adId) }),
  );

  if (cached) {
    return toResult(ad, cached.payload as TMyTracksAnalyseFlex);
  }

  // 2) Sans identité véhicule minimale, l'analyse n'aurait aucun sens : on évite
  //    l'appel payant et on renvoie un état vide.
  const request = buildAnalyseFlexRequest(ad);
  if (!request) return { kind: 'EMPTY' };

  // 3) Appel payant + persistance. `onConflictDoNothing` rend l'insertion
  //    idempotente si deux clics concurrents passent le cache en même temps.
  let payload: TMyTracksAnalyseFlex;
  try {
    payload = await fetchAnalyseFlex(request);
  } catch {
    throw new Error(EPriceAnalysisErrorCode.ANALYSIS_FAILED);
  }

  await db.rls((tx) =>
    tx.insert(priceAnalyses).values({ adId, payload }).onConflictDoNothing(),
  );

  return toResult(ad, payload);
}

type TAdForAnalysis = {
  brand?: { name: string } | null;
  vehicleModel?: { name: string } | null;
  fuel?: { name: string } | null;
  gearBox?: { name: string } | null;
  vehicleSeats?: { name: string } | null;
  price: number;
  modelYear: number | null;
  mileage: number | null;
  dinPower: number | null;
};

/**
 * Construit la requête mytracks à partir de l'annonce. Renvoie `null` si les
 * champs identitaires de base manquent (marque, modèle, année, kilométrage) —
 * sans eux l'estimation ne serait pas fiable.
 */
function buildAnalyseFlexRequest(ad: TAdForAnalysis): TAnalyseFlexParams | null {
  const brand = ad.brand?.name;
  const modelName = ad.vehicleModel?.name;

  if (!brand || !modelName || ad.modelYear == null || ad.mileage == null) {
    return null;
  }

  return {
    brand,
    model_name: modelName,
    fuel_type: ad.fuel?.name ?? DEFAULT_FUEL_TYPE,
    gearbox_type: ad.gearBox?.name ?? DEFAULT_GEARBOX_TYPE,
    year: ad.modelYear,
    doors: DEFAULT_DOORS,
    seats: parseSeats(ad.vehicleSeats?.name) ?? DEFAULT_SEATS,
    horsepower: DEFAULT_FISCAL_HP,
    horse_power_din: ad.dinPower ?? DEFAULT_DIN_HP,
    mileage: Math.round(ad.mileage),
    vehicle_type: DEFAULT_VEHICLE_TYPE,
  };
}

/** `vehicle_seats.name` peut valoir "5" ou "5 places" → on extrait l'entier. */
function parseSeats(label?: string | null): number | null {
  if (!label) return null;
  const match = label.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function toResult(
  ad: TAdForAnalysis,
  payload: TMyTracksAnalyseFlex,
): TPriceAnalysisResult {
  const view = toView(ad, payload);
  // Aucun comparable exploitable → état vide plutôt qu'un graphique sans points.
  if (view.points.length === 0) return { kind: 'EMPTY' };
  return { kind: 'OK', analysis: view };
}

/** Transforme la réponse brute mytracks en modèle d'affichage. */
function toView(ad: TAdForAnalysis, payload: TMyTracksAnalyseFlex): TPriceAnalysisView {
  const now = Date.now();

  const points: TPriceAnalysisPoint[] = (payload.points ?? [])
    // On ne garde que les annonces dont les axes du graphique sont renseignés.
    .filter((p) => p.price != null && p.mileage != null && p.year != null)
    .map((p) => ({
      id: p.ad_id,
      price: p.price as number,
      mileage: p.mileage as number,
      year: p.year as number,
      sim: p.similarity,
      owner: p.owner_type?.toUpperCase().startsWith('PRO') ? 'pro' : 'priv',
      ageDays: p.first_publication_date
        ? Math.max(0, Math.floor((now - new Date(p.first_publication_date).getTime()) / MS_PER_DAY))
        : 0,
      hp: p.horse_power_din,
      // Une annonce désactivée est considérée vendue (sortie du marché).
      sold: p.first_deactivated_date != null,
    }));

  const prices = points.map((p) => p.price).sort((a, b) => a - b);

  const stats: TPriceAnalysisStats = {
    brand: ad.brand?.name ?? '',
    model: ad.vehicleModel?.name ?? '',
    yearMode: ad.modelYear,
    hp: ad.dinPower,
    prediction: payload.vehicle_prediction?.prediction ?? null,
    count: payload.count ?? points.length,
    tempsVente: payload.temps_vente ?? null,
    similarityMin: payload.similarity_min ?? null,
    priceMin: prices[0] ?? 0,
    priceMedian: median(prices),
    priceMax: prices[prices.length - 1] ?? 0,
    proCount: points.filter((p) => p.owner === 'pro').length,
    privCount: points.filter((p) => p.owner === 'priv').length,
  };

  return { annoncePrice: ad.price, stats, points };
}

/** Médiane d'une liste DÉJÀ triée croissante. */
function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
}
