'use client';

import { initPwaInstallCapture } from '@/lib/pwa-install';
import { useEffect } from 'react';

// Monté une fois dans le layout racine. Deux rôles au chargement de l'app :
//  1. enregistrer le service worker (requis pour l'installabilité + le push),
//  2. capter l'event `beforeinstallprompt` avant que l'utilisateur n'ouvre les
//     réglages (sinon l'event, émis tôt par Chrome, serait perdu → pas de
//     bouton d'installation).
export function PwaSetup() {
  useEffect(() => {
    initPwaInstallCapture();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Échec silencieux : l'app fonctionne sans SW (juste pas d'install/push).
      });
    }
  }, []);

  return null;
}
