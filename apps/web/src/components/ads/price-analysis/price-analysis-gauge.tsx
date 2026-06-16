import { Badge } from '@/components/ui/badge';
import type { TPriceAnalysisView } from '@/services/price-analysis.service';
import { Check, Gauge, TriangleAlert } from 'lucide-react';
import { eur, pct } from './format';

type Props = {
  analysis: TPriceAnalysisView;
};

/**
 * Situe le prix de l'annonce sur l'échelle du marché (min → max), avec repères
 * pour la médiane et l'estimation. Tout est positionné en pourcentage de la
 * largeur, pas d'état : composant purement présentationnel.
 */
export function PriceAnalysisGauge({ analysis }: Props) {
  const { stats, annoncePrice } = analysis;
  const { priceMin, priceMedian, priceMax, prediction } = stats;

  // Bornes de l'échelle, élargies un peu pour ne pas coller les marqueurs aux bords.
  const lo = Math.min(priceMin, annoncePrice, prediction ?? priceMin) * 0.985;
  const hi = Math.max(priceMax, annoncePrice, prediction ?? priceMax) * 1.015;
  const position = (value: number) =>
    Math.max(0, Math.min(100, ((value - lo) / (hi - lo)) * 100));

  const deltaPct = priceMedian > 0 ? ((annoncePrice - priceMedian) / priceMedian) * 100 : 0;
  const under = annoncePrice <= priceMedian;

  return (
    <div className="bg-card/50 rounded-xl border p-5">
      <div className="mb-8 flex items-center justify-between">
        <div className="text-muted-foreground flex items-center gap-2">
          <Gauge className="size-4" />
          <span className="text-xs font-semibold tracking-wide uppercase">
            Positionnement marché
          </span>
        </div>
        <Badge variant={under ? 'default' : 'destructive'}>
          {under ? `${pct(deltaPct)} sous la médiane` : `${pct(deltaPct)} au-dessus`}
        </Badge>
      </div>

      <div className="relative mt-10 h-2 rounded-full bg-gradient-to-r from-primary/60 via-primary/25 to-destructive/50">
        {/* Repère médiane */}
        <Tick percent={position(priceMedian)} label="Médiane" value={eur(priceMedian)} />
        {/* Repère estimation marché */}
        {prediction != null && (
          <Tick percent={position(prediction)} label="Estimé" value={eur(prediction)} />
        )}

        {/* Marqueur "cette annonce" */}
        <div
          className="absolute -top-1.5 z-10 -translate-x-1/2"
          style={{ left: `${position(annoncePrice)}%` }}
        >
          <span
            className={`ring-background flex size-5 items-center justify-center rounded-full ring-4 ${
              under ? 'bg-primary text-primary-foreground' : 'bg-destructive text-white'
            }`}
          >
            {under ? <Check className="size-3" /> : <TriangleAlert className="size-3" />}
          </span>
          <div className="absolute top-7 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
            <div className="text-muted-foreground text-xs font-semibold">Cette annonce</div>
            <div
              className={`text-sm font-extrabold ${under ? 'text-primary' : 'text-destructive'}`}
            >
              {eur(annoncePrice)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16 flex items-center justify-between text-xs">
        <RangeEnd label="Min marché" value={eur(priceMin)} />
        <RangeEnd label="Max marché" value={eur(priceMax)} align="right" />
      </div>
    </div>
  );
}

function Tick({ percent, label, value }: { percent: number; label: string; value: string }) {
  return (
    <div
      className="absolute -top-9 -translate-x-1/2 text-center whitespace-nowrap"
      style={{ left: `${percent}%` }}
    >
      <div className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
        {label}
      </div>
      <div className="text-xs font-bold">{value}</div>
    </div>
  );
}

function RangeEnd({
  label,
  value,
  align = 'left',
}: {
  label: string;
  value: string;
  align?: 'left' | 'right';
}) {
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <div className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
        {label}
      </div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}
