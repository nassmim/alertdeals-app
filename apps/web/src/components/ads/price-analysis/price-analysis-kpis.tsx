import type { TPriceAnalysisView } from '@/services/price-analysis.service';
import { Gauge, Layers, Tag, Timer } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { eur, num, pct } from './format';

type Props = {
  analysis: TPriceAnalysisView;
};

/** Bandeau des 4 indicateurs clés en tête de l'analyse. */
export function PriceAnalysisKpis({ analysis }: Props) {
  const { stats, annoncePrice } = analysis;

  // Écart du prix de l'annonce face à l'estimation marché (négatif = en-dessous).
  const deltaPct =
    stats.prediction && stats.prediction > 0
      ? ((annoncePrice - stats.prediction) / stats.prediction) * 100
      : null;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat
        icon={Gauge}
        label="Prix estimé"
        value={eur(stats.prediction)}
        sub="Valeur marché"
      />
      <Stat
        icon={Tag}
        label="Prix de l'annonce"
        value={eur(annoncePrice)}
        sub={deltaPct != null ? `${pct(deltaPct)} vs estimé` : undefined}
        subClassName={
          deltaPct != null && deltaPct <= 0 ? 'text-primary' : 'text-destructive'
        }
        highlight
      />
      <Stat
        icon={Timer}
        label="Temps de vente"
        value={stats.tempsVente != null ? `${stats.tempsVente} j` : '—'}
        sub="estimé sur ce marché"
      />
      <Stat
        icon={Layers}
        label="Comparables"
        value={num(stats.count)}
        sub={
          stats.similarityMin != null
            ? `similarité ≥ ${Math.round(stats.similarityMin)} %`
            : undefined
        }
      />
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  subClassName,
  highlight,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  subClassName?: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-card/50 flex flex-col gap-1.5 rounded-xl border p-4">
      <div className="text-muted-foreground flex items-center gap-2">
        <Icon className="size-4" />
        <span className="text-xs font-semibold tracking-wide uppercase">{label}</span>
      </div>
      <div
        className={
          highlight
            ? 'text-primary text-2xl leading-none font-extrabold'
            : 'text-2xl leading-none font-extrabold'
        }
      >
        {value}
      </div>
      {sub && (
        <div className={subClassName ?? 'text-muted-foreground text-sm font-medium'}>
          {sub}
        </div>
      )}
    </div>
  );
}
