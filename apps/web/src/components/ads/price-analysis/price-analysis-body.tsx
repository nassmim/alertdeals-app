import { Badge } from '@/components/ui/badge';
import type { TPriceAnalysisView } from '@/services/price-analysis.service';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { num } from './format';
import { PriceAnalysisGauge } from './price-analysis-gauge';
import { PriceAnalysisKpis } from './price-analysis-kpis';
import { PriceAnalysisScatter } from './price-analysis-scatter';
import { PriceAnalysisSimilarList } from './price-analysis-similar-list';

type Props = {
  analysis: TPriceAnalysisView;
};

/** Vue complète quand l'analyse est disponible. */
export function PriceAnalysisBody({ analysis }: Props) {
  const { stats, annoncePrice } = analysis;
  const verdict = getVerdict(annoncePrice, stats.prediction);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <h3 className="text-xl font-extrabold tracking-tight">
          {stats.brand} {stats.model}
        </h3>
        <Badge variant={verdict.variant}>
          <verdict.icon className="size-3" />
          {verdict.label}
        </Badge>
        <span className="text-muted-foreground text-sm">
          {stats.yearMode ?? '—'} · {stats.hp != null ? `${stats.hp} ch` : '—'}
        </span>
      </div>

      <PriceAnalysisKpis analysis={analysis} />
      <PriceAnalysisGauge analysis={analysis} />
      <PriceAnalysisScatter analysis={analysis} />
      <PriceAnalysisSimilarList analysis={analysis} />

      <p className="text-muted-foreground px-1 text-xs leading-relaxed">
        Analyse calculée à partir de {num(stats.count)} annonces du marché (dont{' '}
        {num(stats.proCount)} professionnels et {num(stats.privCount)} particuliers),
        filtrées par similarité. Les prix affichés sont indicatifs et ne constituent pas
        une estimation contractuelle.
      </p>
    </div>
  );
}

/** Verdict du prix de l'annonce face à l'estimation marché (seuil ±3 %). */
function getVerdict(annoncePrice: number, prediction: number | null) {
  if (!prediction || prediction <= 0) {
    return { variant: 'secondary' as const, icon: Minus, label: 'Prix de marché' };
  }
  const deltaPct = ((annoncePrice - prediction) / prediction) * 100;
  if (deltaPct <= -3) {
    return { variant: 'default' as const, icon: TrendingDown, label: 'Bonne affaire' };
  }
  if (deltaPct < 3) {
    return { variant: 'secondary' as const, icon: Minus, label: 'Au prix du marché' };
  }
  return { variant: 'destructive' as const, icon: TrendingUp, label: 'Au-dessus du marché' };
}
