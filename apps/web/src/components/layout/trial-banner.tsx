'use client';

import { pages } from '@/config/routes';
import { AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const DISMISS_KEY = 'trial-banner-dismissed';

type Props = {
  expiringSoon: boolean;
  expired: boolean;
  daysLeft: number | null;
};

/**
 * Trial status banner shown at the top of the dashboard.
 *
 * Visible when:
 *  - The trial expires in ≤ 5 days (amber, dismissable per session);
 *  - The trial is over and there is no active subscription (red, non-dismissable).
 *
 * Hidden otherwise. The "expired" variant is non-dismissable on purpose — the user
 * cannot use the app anyway, hiding the call-to-action would just confuse them.
 */
export function TrialBanner({ expiringSoon, expired, daysLeft }: Props) {
  const [isDismissed, setIsDismissed] = useState(false);

  // Read from sessionStorage in an effect so SSR hydration matches (no localStorage on the server).
  useEffect(() => {
    setIsDismissed(sessionStorage.getItem(DISMISS_KEY) === 'true');
  }, []);

  if (isDismissed || (!expiringSoon && !expired)) return null;

  const isExpired = expired && !expiringSoon;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, 'true');
    setIsDismissed(true);
  };

  const tone = isExpired
    ? {
        border: 'border-red-500/30',
        bg: 'bg-red-500/10',
        text: 'text-red-300',
        sub: 'text-red-200/80',
        button: 'bg-red-500 hover:bg-red-400 text-slate-950',
      }
    : {
        border: 'border-amber-500/30',
        bg: 'bg-amber-500/10',
        text: 'text-amber-300',
        sub: 'text-amber-200/80',
        button: 'bg-amber-500 hover:bg-amber-400 text-slate-950',
      };

  return (
    <div className={`relative z-10 border-b ${tone.border} ${tone.bg}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${tone.text}`} />
          <div>
            <p className={`text-sm font-medium ${tone.text}`}>
              {isExpired
                ? 'Essai gratuit terminé'
                : `Ton essai expire dans ${daysLeft} jour${daysLeft !== 1 ? 's' : ''}`}
            </p>
            <p className={`mt-0.5 text-xs ${tone.sub}`}>
              {isExpired
                ? 'Abonne-toi pour continuer à recevoir tes alertes.'
                : "Abonne-toi avant la fin de l'essai pour ne pas perdre l'accès."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={pages.subscription}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${tone.button}`}
          >
            S&apos;abonner
          </Link>
          {!isExpired && (
            <button
              onClick={dismiss}
              aria-label="Fermer"
              className={`cursor-pointer rounded-lg p-1.5 transition-colors hover:bg-white/10 ${tone.text}`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
