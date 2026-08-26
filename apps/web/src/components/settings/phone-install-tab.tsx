'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushSubscription } from '@/hooks/use-push-subscription';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { Bell, Check, Download, Share, Smartphone } from 'lucide-react';

// Onglet "Installation téléphone" du dashboard settings. Deux blocs distincts :
//  1. installer AlertDeals en PWA (prompt natif Android vs. ajout manuel iOS),
//  2. activer les notifications push sur l'appareil.
// Sur iOS le push n'est possible qu'une fois l'app installée, d'où l'ordre.
export function PhoneInstallTab() {
  return (
    <div className="space-y-6">
      <InstallCard />
      <NotificationsCard />
    </div>
  );
}

function InstallCard() {
  const { canPrompt, isIOS, isInstalled, promptInstall } = usePwaInstall();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Installation téléphone
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isInstalled ? (
          // App déjà lancée en standalone : rien à installer.
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-primary" />
            AlertDeals est déjà installée sur cet appareil.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Installe AlertDeals sur ton téléphone pour la lancer en plein écran
              comme une vraie app et recevoir les notifications.
            </p>

            {canPrompt && (
              // Android/Chrome : prompt d'installation natif disponible.
              <Button onClick={promptInstall} className="gap-2">
                <Download className="h-4 w-4" />
                Installer l'application
              </Button>
            )}

            {isIOS && (
              // iOS ne propose aucun prompt : on guide l'ajout manuel via Safari.
              <div className="rounded-lg bg-secondary p-4 text-sm text-secondary-foreground">
                <p className="mb-2 font-medium">Sur iPhone / iPad (Safari) :</p>
                <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                  <li className="flex items-center gap-1">
                    Appuie sur <Share className="inline h-4 w-4" /> Partager
                  </li>
                  <li>Choisis « Sur l'écran d'accueil »</li>
                  <li>Valide avec « Ajouter »</li>
                </ol>
              </div>
            )}

            {!canPrompt && !isIOS && (
              // Desktop ou navigateur sans prompt : install via le menu du navigateur.
              <p className="text-sm text-muted-foreground">
                Ouvre le menu de ton navigateur puis « Installer AlertDeals » pour
                l'ajouter à ton appareil.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function NotificationsCard() {
  const { isSupported, isSubscribed, isBusy, enable, disable } = usePushSubscription();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isSupported ? (
          // Navigateur sans support (ou iOS pas encore installé en PWA).
          <p className="text-sm text-muted-foreground">
            Les notifications ne sont pas disponibles sur cet appareil. Sur iPhone,
            installe d'abord l'app sur ton écran d'accueil.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Reçois une notification sur cet appareil dès qu'une nouvelle
              opportunité correspond à tes alertes.
            </p>

            {isSubscribed ? (
              <Button variant="outline" onClick={disable} disabled={isBusy}>
                Désactiver les notifications
              </Button>
            ) : (
              <Button onClick={enable} disabled={isBusy} className="gap-2">
                <Bell className="h-4 w-4" />
                Activer les notifications
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
