'use client';

import {
  canPromptInstall,
  subscribePwaInstall,
  triggerInstallPrompt,
} from '@/lib/pwa-install';
import { useEffect, useState } from 'react';

type TPwaInstall = {
  // Android/Chrome : un prompt d'install natif est disponible.
  canPrompt: boolean;
  // iOS : pas de prompt programmable, on affiche un tuto manuel à la place.
  isIOS: boolean;
  // L'app est déjà lancée en mode installé (standalone) → rien à proposer.
  isInstalled: boolean;
  // Déclenche le prompt natif (no-op si indisponible).
  promptInstall: () => Promise<void>;
};

/**
 * Expose l'état d'installation de la PWA à l'UI. La capture de
 * `beforeinstallprompt` est faite globalement au chargement (cf. PwaSetup) ;
 * ce hook se contente de lire l'état partagé et de détecter iOS / standalone.
 */
export function usePwaInstall(): TPwaInstall {
  const [canPrompt, setCanPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Détection standalone : media query (Android/desktop) + `navigator.standalone` (iOS).
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);

    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    // État initial + abonnement aux changements captés globalement par PwaSetup.
    setCanPrompt(canPromptInstall());
    return subscribePwaInstall(() => setCanPrompt(canPromptInstall()));
  }, []);

  return {
    canPrompt,
    isIOS,
    isInstalled,
    promptInstall: triggerInstallPrompt,
  };
}
