'use client';

import { pages } from '@/config/routes';
import type { TTrialStatus } from '@/services/trial.service';
import { AlertTriangle, Bell, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const DISMISS_KEY = 'trial-banner-dismissed';

type Props = {
  status: TTrialStatus;
};

/**
 * Top-of-dashboard banner driven by the trial state.
 *
 * Hidden when the account is subscribed. Otherwise renders one of three variants
 * (not_started / active / expired). The "expired" variant is non-dismissable
 * because the user cannot use the app anyway — hiding the CTA would just confuse them.
 */
export function TrialBanner({ status }: Props) {
  const [isDismissed, setIsDismissed] = useState(false);

  // sessionStorage is browser-only, so we read it in an effect to keep SSR + hydration aligned.
  useEffect(() => {
    setIsDismissed(sessionStorage.getItem(DISMISS_KEY) === 'true');
  }, []);

  if (status.state === 'subscribed') return null;

  // Only the expired variant ignores dismissal — see component-level comment.
  if (isDismissed && status.state !== 'expired') return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, 'true');
    setIsDismissed(true);
  };

  if (status.state === 'not_started') {
    return (
      <BannerShell tone="info" icon={<Bell className="h-5 w-5" />} onDismiss={dismiss}>
        <p className="text-sm font-medium text-indigo-200">
          Crée ta 1ère alerte pour démarrer ton essai gratuit de 3 jours.
        </p>
        <p className="mt-0.5 text-xs text-indigo-300/80">
          Tu recevras des alertes en temps réel sur les meilleures affaires.
        </p>
      </BannerShell>
    );
  }

  if (status.state === 'active') {
    const dayLabel = status.daysRemaining > 1 ? 'jours' : 'jour';
    return (
      <BannerShell
        tone="info"
        icon={<Sparkles className="h-5 w-5" />}
        onDismiss={dismiss}
      >
        <p className="text-sm font-medium text-indigo-200">
          Essai gratuit en cours — {status.daysRemaining} {dayLabel} restant
          {status.daysRemaining > 1 ? 's' : ''}.
        </p>
        <p className="mt-0.5 text-xs text-indigo-300/80">
          Tu reçois les alertes des bonnes affaires pendant tout ton essai.
        </p>
      </BannerShell>
    );
  }

  // state === 'expired'
  return (
    <BannerShell tone="danger" icon={<AlertTriangle className="h-5 w-5" />}>
      <p className="text-sm font-medium text-red-200">Ton essai est terminé.</p>
      <p className="mt-0.5 text-xs text-red-300/80">
        Abonne-toi pour continuer de recevoir les meilleures affaires en premier.
      </p>
    </BannerShell>
  );
}

type ShellProps = {
  tone: 'info' | 'danger';
  icon: React.ReactNode;
  children: React.ReactNode;
  onDismiss?: () => void;
};

// Shared frame so the 3 variants stay visually consistent; only colors + CTA copy change.
function BannerShell({ tone, icon, children, onDismiss }: ShellProps) {
  const toneClasses =
    tone === 'danger'
      ? {
          border: 'border-red-500/30',
          bg: 'bg-red-500/10',
          iconText: 'text-red-300',
          btn: 'bg-red-500 hover:bg-red-400 text-slate-950',
          dismissText: 'text-red-300',
        }
      : {
          border: 'border-indigo-500/30',
          bg: 'bg-indigo-500/10',
          iconText: 'text-indigo-300',
          btn: 'bg-indigo-500 hover:bg-indigo-400 text-slate-950',
          dismissText: 'text-indigo-300',
        };

  const ctaLabel = tone === 'danger' ? "S'abonner" : "S'abonner";

  return (
    <div className={`relative z-10 border-b ${toneClasses.border} ${toneClasses.bg}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 flex-shrink-0 ${toneClasses.iconText}`}>{icon}</span>
          <div>{children}</div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={pages.subscription}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${toneClasses.btn}`}
          >
            {ctaLabel}
          </Link>
          {onDismiss && (
            <button
              onClick={onDismiss}
              aria-label="Fermer"
              className={`cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-white/10 ${toneClasses.dismissText}`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
