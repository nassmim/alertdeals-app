// Helpers partagés pour présenter la marge d'une annonce (carte de la
// grille hot-deals ET carte d'analyse de la page détail). On centralise ici
// deux choses qui doivent rester cohérentes entre les deux écrans :
//   1. Le FORMAT du texte (fourchette min/max explicite, en € et en %).
//   2. Le NIVEAU sémantique → couleur, selon le signe des bornes :
//        - "danger"  : marge max < 0     → aucune marge possible (rouge).
//        - "warning" : marge min < 0 ≤ max → marge incertaine selon la
//                      négociation (ambre).
//        - "success" : marge min ≥ 0     → bonne affaire (vert).
//
// La couleur est pilotée par le MONTANT de marge (marginAmount), pas par le
// %, car c'est le montant qui porte la décision business. Le % suit la même
// classe de couleur pour rester cohérent visuellement.

const eurosFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export type TMarginLevel = "danger" | "warning" | "success";

export type TMarginPresentation = {
  level: TMarginLevel;
  // Montant : soit deux bornes distinctes ("min" + "max"), soit une seule
  // valeur ("single") quand min === max ou qu'une seule borne existe.
  amount:
    | { kind: "range"; min: string; max: string }
    | { kind: "single"; value: string }
    | null;
  // Pourcentage : même logique que le montant.
  percent:
    | { kind: "range"; min: string; max: string }
    | { kind: "single"; value: string }
    | null;
};

// Détermine le niveau de couleur à partir des bornes de MONTANT de marge.
// On se base en priorité sur la borne max (le meilleur cas espéré) puis sur
// la borne min (le pire cas). Si on n'a qu'une seule borne, on la traite
// comme min ET max.
function computeLevel(min: number | null, max: number | null): TMarginLevel {
  const lo = min ?? max;
  const hi = max ?? min;
  // lo/hi sont non-null ici car au moins une borne existe (garde côté appelant).
  if (hi != null && hi < 0) return "danger";
  if (lo != null && lo < 0) return "warning";
  return "success";
}

// Formate une paire de bornes (min/max) via un formatter donné. Renvoie une
// forme "range" si les deux bornes existent et diffèrent, sinon "single",
// sinon null si aucune borne.
function formatRange(
  min: number | null,
  max: number | null,
  format: (v: number) => string,
):
  | { kind: "range"; min: string; max: string }
  | { kind: "single"; value: string }
  | null {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max)
    return { kind: "range", min: format(min), max: format(max) };
  if (min != null) return { kind: "single", value: format(min) };
  return { kind: "single", value: format(max!) };
}

// Worker stocke des fractions (0.15 = 15%) — on convertit en % affichable.
const toPercent = (v: number) => `${Math.round(v * 100)}%`;
const toEuros = (v: number) => eurosFormatter.format(v);

// Point d'entrée : à partir des 4 colonnes marge d'une annonce, renvoie le
// niveau de couleur + les montants/% formatés. Renvoie `null` si l'annonce
// n'a aucune donnée de marge (rien à afficher).
export function getMarginPresentation(input: {
  marginAmountMin: number | null;
  marginAmountMax: number | null;
  marginPercentageMin: number | null;
  marginPercentageMax: number | null;
}): TMarginPresentation | null {
  const amount = formatRange(
    input.marginAmountMin,
    input.marginAmountMax,
    toEuros,
  );
  const percent = formatRange(
    input.marginPercentageMin,
    input.marginPercentageMax,
    toPercent,
  );

  if (!amount && !percent) return null;

  return {
    level: computeLevel(input.marginAmountMin, input.marginAmountMax),
    amount,
    percent,
  };
}

// Classes Tailwind par niveau, regroupées pour réutilisation sur les deux
// écrans. `container` = bordure + fond de l'encart ; `text` = couleur du
// texte (labels + valeurs).
export const MARGIN_LEVEL_CLASSES: Record<
  TMarginLevel,
  { container: string; text: string }
> = {
  danger: {
    container:
      "border-red-200/60 bg-red-50/70 dark:border-red-900/40 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-300",
  },
  // Warning = ambre/jaune FRANC (et non plus un orangé qui tirait vers le
  // rouge danger). On pousse la teinte vers le jaune chaud + on renforce
  // bordure et fond pour bien décoller du scénario "danger".
  warning: {
    container:
      "border-yellow-300 bg-yellow-100/80 dark:border-yellow-800/50 dark:bg-yellow-950/40",
    text: "text-yellow-800 dark:text-yellow-200",
  },
  success: {
    container:
      "border-emerald-200/60 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
  },
};
