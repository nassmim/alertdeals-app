import { getAdGoodDealConfig } from '@alertdeals/shared';
import { Flame, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// Variantes d'affichage du badge "bonne affaire" :
//  - compact : pastille discrète, posée sur une carte (liste hot-deals).
//  - default : badge moyen, pour une zone de contenu plus aérée.
//  - hero    : version mise en avant (page détail), avec sous-label.
type TDealBadgeVariant = 'compact' | 'default' | 'hero';

type TDealBadgeProps = {
  // Valeur brute stockée en base (`ads.goodDealName`) — ex. "Bonne affaire".
  // Null/undefined = pas de tier détecté → le badge ne s'affiche pas.
  goodDealName: string | null | undefined;
  variant?: TDealBadgeVariant;
  className?: string;
};

const ICONS = {
  flame: Flame,
  sparkles: Sparkles,
} as const;

/**
 * Badge qualité d'affaire, piloté par `getAdGoodDealConfig` (source de vérité
 * partagée worker/web). Deux tiers : "Très bonne affaire" (premium, flamme,
 * ambre) et "Bonne affaire" (positive, sparkles, vert).
 *
 * Le code couleur ambre/vert est volontairement hors thème : c'est un signal
 * business repris tel quel d'auto-prospect (demande du boss) pour que la
 * qualité de l'affaire saute aux yeux, indépendamment du thème de l'app.
 */
export function DealBadge({
  goodDealName,
  variant = 'default',
  className,
}: TDealBadgeProps) {
  const config = getAdGoodDealConfig(goodDealName);
  if (!config) return null;

  const Icon = ICONS[config.icon];
  const isPremium = config.tone === 'premium';

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'relative inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur-md shadow-lg',
          isPremium
            ? 'border-amber-300/40 bg-gradient-to-r from-amber-500/95 to-orange-600/95 text-black'
            : 'border-emerald-400/30 bg-emerald-500/90 text-emerald-950',
          className,
        )}
      >
        {isPremium && (
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-amber-400/40" />
        )}
        <Icon className="h-3 w-3" strokeWidth={2.5} />
        <span>{config.shortLabel}</span>
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div
        className={cn(
          'relative inline-flex items-center gap-3 overflow-hidden rounded-xl border px-4 py-2.5 shadow-lg',
          isPremium
            ? 'border-amber-400/40 bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-red-500/10'
            : 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 to-teal-500/10',
          className,
        )}
      >
        {isPremium && (
          <span className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 animate-pulse rounded-full bg-amber-400/20 blur-2xl" />
        )}
        <div
          className={cn(
            'relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
            isPremium
              ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-amber-500/50 shadow-lg'
              : 'bg-emerald-500 text-emerald-950',
          )}
        >
          {isPremium && (
            <span className="absolute inset-0 animate-ping rounded-lg bg-amber-400/50" />
          )}
          <Icon className="relative h-5 w-5" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col leading-tight">
          <span
            className={cn(
              'text-sm font-bold uppercase tracking-wide',
              isPremium ? 'text-amber-300' : 'text-emerald-300',
            )}
          >
            {config.label}
          </span>
          <span className="text-xs text-zinc-400">{config.sublabel}</span>
        </div>
      </div>
    );
  }

  // default
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5',
        isPremium
          ? 'border-amber-500/40 bg-amber-500/10'
          : 'border-emerald-500/40 bg-emerald-500/10',
        className,
      )}
    >
      <div className="relative flex items-center justify-center">
        {isPremium && (
          <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/40" />
        )}
        <Icon
          className={cn(
            'relative h-4 w-4',
            isPremium ? 'text-amber-400' : 'text-emerald-400',
          )}
          strokeWidth={2.5}
        />
      </div>
      <div className="flex flex-col leading-tight">
        <span
          className={cn(
            'text-xs font-bold uppercase tracking-wide',
            isPremium ? 'text-amber-300' : 'text-emerald-300',
          )}
        >
          {config.label}
        </span>
        <span className="text-[10px] text-zinc-400">{config.sublabel}</span>
      </div>
    </div>
  );
}
