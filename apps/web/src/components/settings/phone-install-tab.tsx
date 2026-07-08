'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { Check, Download, Share, Smartphone } from 'lucide-react';

// Onglet "Installation téléphone" du dashboard settings : propose d'installer
// AlertDeals en PWA sur l'appareil. Le parcours diffère selon la plateforme
// (prompt natif Android/Chrome vs. ajout manuel iOS), d'où le hook dédié.
export function PhoneInstallTab() {
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
              comme une vraie app et bientôt recevoir les notifications.
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
