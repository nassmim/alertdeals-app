import {
  type TMarginPresentation,
  MARGIN_LEVEL_CLASSES,
} from "@/utils/margin.utils";

type Props = {
  presentation: TMarginPresentation;
};

// Encart "marge" partagé entre la carte de la grille et la carte d'analyse
// de la page détail. Couleur pilotée par `presentation.level` (rouge =
// aucune marge, ambre = marge incertaine, vert = bonne affaire) via les
// classes centralisées dans margin.utils.
//
// Quand la marge est une fourchette, on libelle EXPLICITEMENT "Marge min" /
// "Marge max" sur deux lignes — c'était le point de confusion : un simple
// "-660 € – 90 €" ne disait pas que c'étaient les bornes espérées.
export function MarginCallout({ presentation }: Props) {
  const { level, amount, percent } = presentation;
  const classes = MARGIN_LEVEL_CLASSES[level];

  // Suffixe "soit X%" accolé à une valeur de montant, quand le % suit la
  // même forme (single → on l'affiche entre parenthèses derrière le montant).
  const percentSingle = percent?.kind === "single" ? percent.value : null;

  return (
    <div className={`rounded-md border px-2.5 py-2 ${classes.container}`}>
      {amount?.kind === "range" ? (
        <div className="space-y-1">
          <MarginRow
            label="Marge min"
            value={amount.min}
            hint={percent?.kind === "range" ? percent.min : undefined}
            textClass={classes.text}
          />
          <MarginRow
            label="Marge max"
            value={amount.max}
            hint={percent?.kind === "range" ? percent.max : undefined}
            textClass={classes.text}
          />
        </div>
      ) : amount?.kind === "single" ? (
        <MarginRow
          label="Marge"
          value={amount.value}
          hint={percentSingle ?? undefined}
          textClass={classes.text}
        />
      ) : (
        // Pas de montant mais un % seul (cas limite) : on affiche le % brut.
        percent && (
          <MarginRow
            label="Marge"
            value={percent.kind === "single" ? percent.value : percent.min}
            textClass={classes.text}
          />
        )
      )}
    </div>
  );
}

// Ligne label / valeur de l'encart. `hint` = le % correspondant, affiché en
// plus discret juste après la valeur (ex. "90 € · 3%").
function MarginRow({
  label,
  value,
  hint,
  textClass,
}: {
  label: string;
  value: string;
  hint?: string;
  textClass: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className={`text-xs font-medium opacity-90 ${textClass}`}>
        {label}
      </span>
      <span className={`text-sm font-semibold ${textClass}`}>
        {value}
        {hint && <span className="ml-1 text-xs font-medium opacity-80">· {hint}</span>}
      </span>
    </div>
  );
}
