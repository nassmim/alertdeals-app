'use client';

import { Badge } from '@/components/ui/badge';
import type {
  TPriceAnalysisPoint,
  TPriceAnalysisView,
} from '@/services/price-analysis.service';
import { ArrowDown, ArrowUp, Car, ChevronDown, Clock } from 'lucide-react';
import { useState } from 'react';
import { eur, km, num } from './format';

type Props = {
  analysis: TPriceAnalysisView;
};

type SortKey = 'sim' | 'priceAsc' | 'priceDesc' | 'mileage' | 'age';

const SORTERS: Record<SortKey, (a: TPriceAnalysisPoint, b: TPriceAnalysisPoint) => number> = {
  sim: (a, b) => b.sim - a.sim,
  priceAsc: (a, b) => a.price - b.price,
  priceDesc: (a, b) => b.price - a.price,
  mileage: (a, b) => a.mileage - b.mileage,
  age: (a, b) => a.ageDays - b.ageDays,
};

const SORT_TABS: { key: SortKey; label: string }[] = [
  { key: 'sim', label: 'Similarité' },
  { key: 'priceAsc', label: 'Prix ↑' },
  { key: 'priceDesc', label: 'Prix ↓' },
  { key: 'mileage', label: 'Km' },
  { key: 'age', label: 'Récence' },
];

const INITIAL_LIMIT = 8;
const LIMIT_STEP = 10;

export function PriceAnalysisSimilarList({ analysis }: Props) {
  const [sort, setSort] = useState<SortKey>('sim');
  const [limit, setLimit] = useState(INITIAL_LIMIT);

  const { stats, annoncePrice, points } = analysis;
  const sorted = [...points].sort(SORTERS[sort]);
  const rows = sorted.slice(0, limit);
  const remaining = points.length - limit;

  return (
    <div className="bg-card/50 rounded-xl border p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted-foreground flex items-center gap-2">
          <Car className="size-4" />
          <span className="text-xs font-semibold tracking-wide uppercase">
            Véhicules similaires · {num(points.length)}
          </span>
        </div>
        <div className="bg-muted flex items-center gap-1 rounded-lg p-1">
          {SORT_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSort(tab.key)}
              className={`h-7 rounded-md px-2.5 text-xs font-semibold transition ${
                sort === tab.key
                  ? 'bg-background text-foreground border'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {rows.map((p) => {
          const diff = p.price - annoncePrice;
          return (
            <div
              key={p.id}
              className="hover:bg-muted/50 flex items-center gap-4 rounded-lg border border-transparent px-3 py-2.5 transition hover:border-border"
            >
              <div className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-lg">
                <Car className="size-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-bold">
                    {stats.brand} {stats.model}
                  </span>
                  <Badge variant={p.owner === 'pro' ? 'default' : 'secondary'}>
                    {p.owner === 'pro' ? 'Pro' : 'Particulier'}
                  </Badge>
                </div>
                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 text-[12.5px]">
                  <span>{p.year}</span>
                  <span>·</span>
                  <span>{km(p.mileage)}</span>
                  {p.hp != null && (
                    <>
                      <span>·</span>
                      <span>{p.hp} ch</span>
                    </>
                  )}
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {p.ageDays} j
                  </span>
                </div>
              </div>

              <div className="hidden w-16 flex-col items-center sm:flex">
                <span className="text-muted-foreground text-[11px] font-semibold uppercase">
                  Sim.
                </span>
                <SimMeter value={p.sim} />
              </div>

              <div className="w-28 shrink-0 text-right">
                <div className="text-[17px] font-extrabold">{eur(p.price)}</div>
                <div
                  className={`flex items-center justify-end gap-1 text-xs font-semibold ${
                    diff >= 0 ? 'text-destructive' : 'text-primary'
                  }`}
                >
                  {diff >= 0 ? (
                    <ArrowUp className="size-3" />
                  ) : (
                    <ArrowDown className="size-3" />
                  )}
                  {eur(Math.abs(diff))}
                </div>
                <div className="text-muted-foreground mt-0.5 text-[10.5px]">
                  vs cette annonce
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + LIMIT_STEP)}
          className="bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition"
        >
          <ChevronDown className="size-4" />
          Afficher {Math.min(LIMIT_STEP, remaining)} de plus
        </button>
      )}
    </div>
  );
}

function SimMeter({ value }: { value: number }) {
  return (
    <div className="mt-0.5 flex flex-col items-center gap-1">
      <span className="text-primary text-[13px] font-extrabold">{Math.round(value)}%</span>
      <div className="bg-muted h-1.5 w-12 overflow-hidden rounded-full">
        <div className="bg-primary h-full rounded-full" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
