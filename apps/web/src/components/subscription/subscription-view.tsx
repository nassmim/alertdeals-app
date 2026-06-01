'use client';

import {
  createBillingPortalSession,
  createCheckoutSession,
} from '@/actions/subscription.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getErrorMessage } from '@/utils/error-messages.utils';
import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  type TSubscriptionStatus,
} from '@alertdeals/shared';
import type { TPlan, TSubscription } from '@alertdeals/db';
import { ArrowRight, Check, CircleCheck, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

type Props = {
  subscription: TSubscription | null;
  plans: TPlan[];
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  past_due: 'Paiement en retard',
  canceled: 'Annulé',
};

// Prices are stored in cents in DB (Stripe convention); we show whole euros.
function formatAmount(amountInCents: number): string {
  return (amountInCents / 100).toFixed(0);
}

export function SubscriptionView({ subscription, plans }: Props) {
  // We disable the action button using its identifier (priceId or "manage") so users can
  // see exactly which action is in flight when multiple are visible on screen.
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const isActive = subscription
    ? ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status as TSubscriptionStatus)
    : false;

  const handleSubscribe = async (priceId: string) => {
    setLoadingAction(priceId);
    const result = await createCheckoutSession(priceId);
    if ('error' in result) {
      toast.error(getErrorMessage(result.error));
      setLoadingAction(null);
      return;
    }
    if (result.url) {
      window.location.href = result.url;
      return;
    }
    setLoadingAction(null);
  };

  const handleManage = async () => {
    setLoadingAction('manage');
    const result = await createBillingPortalSession();
    if ('error' in result) {
      toast.error(getErrorMessage(result.error));
      setLoadingAction(null);
      return;
    }
    window.location.href = result.url;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Abonnement</h1>
        <p className="text-slate-400">Gère ton abonnement et ta facturation.</p>
      </div>

      {isActive && subscription ? (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-slate-100">Abonnement actif</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CircleCheck className="h-5 w-5 text-emerald-400" />
                <span className="text-slate-200">
                  {STATUS_LABELS[subscription.status] ?? subscription.status}
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Prochaine échéance le{' '}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR')}
              </p>
              <Button
                onClick={handleManage}
                disabled={loadingAction !== null}
                variant="outline"
                className="mt-2"
              >
                {loadingAction === 'manage' ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Gérer mon abonnement
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.length === 0 && (
            <p className="text-sm text-slate-400">Aucun plan disponible pour le moment.</p>
          )}
          {plans.map((plan) => (
            <Card key={plan.id} className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-slate-100">{plan.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plan.description && (
                    <p className="text-sm text-slate-400">{plan.description}</p>
                  )}
                  <p className="text-3xl font-bold text-slate-100">
                    {formatAmount(plan.priceEur)}
                    <span className="text-base font-normal text-slate-400">
                      {' '}
                      € / {plan.interval === 'year' ? 'an' : 'mois'}
                    </span>
                  </p>
                  <ul className="space-y-2 text-sm text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Accès complet à l&apos;application
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      Alertes en temps réel
                    </li>
                  </ul>
                  <Button
                    onClick={() => handleSubscribe(plan.stripePriceId)}
                    disabled={loadingAction !== null}
                    className="w-full"
                  >
                    {loadingAction === plan.stripePriceId ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Redirection...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        S&apos;abonner
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
