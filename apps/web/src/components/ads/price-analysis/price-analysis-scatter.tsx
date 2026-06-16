'use client';

import type {
  TPriceAnalysisPoint,
  TPriceAnalysisView,
} from '@/services/price-analysis.service';
import { Layers } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { eur, km, num } from './format';

type Props = {
  analysis: TPriceAnalysisView;
};

type Mode = 'mileage' | 'age';

// Géométrie du SVG (coordonnées internes, mises à l'échelle via viewBox).
const W = 760;
const H = 430;
const PADDING = { left: 64, right: 24, top: 26, bottom: 52 };
const INNER_W = W - PADDING.left - PADDING.right;
const INNER_H = H - PADDING.top - PADDING.bottom;

/**
 * Nuage de points prix × (kilométrage | ancienneté) des annonces comparables,
 * avec lignes de référence (annonce, médiane, estimé) et infobulle au survol.
 * Les couleurs sont tirées des tokens de thème (var(--primary), etc.).
 */
export function PriceAnalysisScatter({ analysis }: Props) {
  const [mode, setMode] = useState<Mode>('mileage');
  const [hover, setHover] = useState<(TPriceAnalysisPoint & { cx: number; cy: number }) | null>(
    null,
  );
  const [showPro, setShowPro] = useState(true);
  const [showPriv, setShowPriv] = useState(true);

  const { stats, annoncePrice } = analysis;
  const median = stats.priceMedian;
  const prediction = stats.prediction ?? median;

  const shown = analysis.points.filter(
    (p) => (p.owner === 'pro' && showPro) || (p.owner === 'priv' && showPriv),
  );

  const xOf = (p: TPriceAnalysisPoint) => (mode === 'mileage' ? p.mileage : p.ageDays);
  const xMax =
    mode === 'mileage'
      ? Math.max(95000, ...shown.map(xOf))
      : Math.max(120, ...shown.map(xOf));
  const yLo = Math.min(annoncePrice, ...shown.map((p) => p.price)) * 0.96;
  const yHi = Math.max(prediction, ...shown.map((p) => p.price)) * 1.04;

  const sx = (value: number) => PADDING.left + (value / xMax) * INNER_W;
  const sy = (value: number) =>
    PADDING.top + (1 - (value - yLo) / (yHi - yLo)) * INNER_H;

  const xTicks = (
    mode === 'mileage' ? [0, 20000, 40000, 60000, 80000] : [0, 30, 60, 90, 120]
  ).filter((t) => t <= xMax);
  const yTicks = buildYTicks(yLo, yHi);
  const formatX = (value: number) =>
    mode === 'mileage' ? `${Math.round(value / 1000)}k` : `${value}j`;

  return (
    <div className="bg-card/50 rounded-xl border p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted-foreground flex items-center gap-2">
          <Layers className="size-4" />
          <span className="text-xs font-semibold tracking-wide uppercase">
            Annonces comparables · prix
          </span>
        </div>
        <div className="bg-muted flex items-center gap-1 rounded-lg p-1">
          <ModeButton active={mode === 'mileage'} onClick={() => setMode('mileage')}>
            Kilométrage
          </ModeButton>
          <ModeButton active={mode === 'age'} onClick={() => setMode('age')}>
            Ancienneté
          </ModeButton>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          onMouseLeave={() => setHover(null)}
        >
          {/* Grille + libellés Y */}
          {yTicks.map((t) => (
            <g key={`y-${t}`}>
              <line
                x1={PADDING.left}
                y1={sy(t)}
                x2={W - PADDING.right}
                y2={sy(t)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={PADDING.left - 10}
                y={sy(t) + 4}
                textAnchor="end"
                fill="var(--muted-foreground)"
                style={{ fontSize: 11, fontWeight: 600 }}
              >
                {num(t)}
              </text>
            </g>
          ))}

          {/* Libellés X */}
          {xTicks.map((t) => (
            <text
              key={`x-${t}`}
              x={sx(t)}
              y={H - PADDING.bottom + 22}
              textAnchor="middle"
              fill="var(--muted-foreground)"
              style={{ fontSize: 11, fontWeight: 600 }}
            >
              {formatX(t)}
            </text>
          ))}

          {/* Lignes de référence */}
          <ReferenceLine y={sy(prediction)} dashed label={`Estimé ${eur(prediction)}`} />
          <ReferenceLine
            y={sy(median)}
            dashed
            primary
            above
            label={`Médiane ${eur(median)}`}
          />
          <line
            x1={PADDING.left}
            y1={sy(annoncePrice)}
            x2={W - PADDING.right}
            y2={sy(annoncePrice)}
            stroke="var(--foreground)"
            strokeWidth={2}
          />
          <text
            x={W - PADDING.right}
            y={sy(annoncePrice) - 6}
            textAnchor="end"
            fill="var(--foreground)"
            style={{ fontSize: 11, fontWeight: 800 }}
          >
            Annonce {eur(annoncePrice)}
          </text>

          {/* Points */}
          {shown.map((p) => {
            const cx = sx(xOf(p));
            const cy = sy(p.price);
            const active = hover?.id === p.id;
            return (
              <circle
                key={p.id}
                cx={cx}
                cy={cy}
                r={active ? 6.5 : 4}
                fill={p.owner === 'pro' ? 'var(--primary)' : 'var(--muted-foreground)'}
                fillOpacity={active ? 1 : 0.62}
                stroke={active ? 'var(--foreground)' : 'transparent'}
                strokeWidth={1.5}
                style={{ cursor: 'pointer', transition: 'r .1s' }}
                onMouseEnter={() => setHover({ ...p, cx, cy })}
              />
            );
          })}

          {/* Axes */}
          <line
            x1={PADDING.left}
            y1={PADDING.top}
            x2={PADDING.left}
            y2={H - PADDING.bottom}
            stroke="var(--border)"
            strokeWidth={1}
          />
          <line
            x1={PADDING.left}
            y1={H - PADDING.bottom}
            x2={W - PADDING.right}
            y2={H - PADDING.bottom}
            stroke="var(--border)"
            strokeWidth={1}
          />
          <text
            x={W - PADDING.right}
            y={H - PADDING.bottom + 40}
            textAnchor="end"
            fill="var(--muted-foreground)"
            style={{ fontSize: 11, fontWeight: 600 }}
          >
            {mode === 'mileage' ? 'Kilométrage' : 'Jours depuis la mise en ligne'}
          </text>
        </svg>

        {hover && (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full"
            style={{ left: `${(hover.cx / W) * 100}%`, top: `calc(${(hover.cy / H) * 100}% - 12px)` }}
          >
            <div className="bg-popover min-w-[160px] rounded-lg border p-2.5 shadow-lg">
              <div className="text-sm font-extrabold">{eur(hover.price)}</div>
              <div className="text-muted-foreground mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                <span>{km(hover.mileage)}</span>
                <span className="text-right">{hover.year}</span>
                <span>{hover.ageDays} j en ligne</span>
                <span className="text-right font-semibold">
                  {hover.owner === 'pro' ? 'Pro' : 'Particulier'}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between border-t pt-1.5 text-[11px]">
                <span className="text-muted-foreground">Similarité</span>
                <span className="text-primary font-bold">{Math.round(hover.sim)} %</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Légende cliquable (filtre) */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-3">
        <LegendDot
          colorVar="var(--primary)"
          label="Professionnel"
          count={analysis.stats.proCount}
          on={showPro}
          onClick={() => setShowPro((v) => !v)}
        />
        <LegendDot
          colorVar="var(--muted-foreground)"
          label="Particulier"
          count={analysis.stats.privCount}
          on={showPriv}
          onClick={() => setShowPriv((v) => !v)}
        />
        <span className="text-muted-foreground ml-auto text-xs">
          Cliquez une légende pour filtrer · survolez un point
        </span>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 rounded-md px-3.5 text-[13px] font-semibold transition ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function ReferenceLine({
  y,
  label,
  dashed,
  primary,
  above,
}: {
  y: number;
  label: string;
  dashed?: boolean;
  primary?: boolean;
  above?: boolean;
}) {
  const color = primary ? 'var(--primary)' : 'var(--muted-foreground)';
  return (
    <g>
      <line
        x1={PADDING.left}
        y1={y}
        x2={W - PADDING.right}
        y2={y}
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray={dashed ? '5 5' : undefined}
        opacity={0.8}
      />
      <text
        x={PADDING.left + 6}
        y={y + (above ? -6 : 13)}
        fill={color}
        style={{ fontSize: 10.5, fontWeight: 700 }}
      >
        {label}
      </text>
    </g>
  );
}

function LegendDot({
  colorVar,
  label,
  count,
  on,
  onClick,
}: {
  colorVar: string;
  label: string;
  count: number;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 text-[13px] font-medium transition ${
        on ? 'text-foreground' : 'text-muted-foreground line-through opacity-60'
      }`}
    >
      <span className="size-2.5 rounded-full" style={{ background: colorVar }} />
      {label}
      <span className="text-muted-foreground">· {count}</span>
    </button>
  );
}

/** Graduations Y "rondes" à partir d'un pas calculé sur l'amplitude des prix. */
function buildYTicks(lo: number, hi: number): number[] {
  const step = niceStep((hi - lo) / 4);
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticks.push(v);
  return ticks;
}

function niceStep(raw: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}
