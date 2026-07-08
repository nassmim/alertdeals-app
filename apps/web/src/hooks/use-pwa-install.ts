'use client';

import { useEffect, useState } from 'react';

// Event non standard émis par Chrome/Android quand l'app est installable. Absent
// des types DOM par défaut, on le décrit ici pour capter `prompt()`.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type TPwaInstall = {
  // true tant que l'app tourne dans un navigateur (pas encore installée).
  canShow: boolean;
  // Android/Chrome uniquement : un prompt d'install natif est disponible.
  canPrompt: boolean;
  // iOS : pas de prompt programmable, on affiche un tuto manuel à la place.
  isIOS: boolean;
  // L'app est déjà lancée en mode installé (standalone) → rien à proposer.
  isInstalled: boolean;
  // Déclenche le prompt natif (no-op si indisponible).
  promptInstall: () => Promise<void>;
};

/**
 * Gère l'état d'installation de la PWA côté client.
 *
 * Chrome/Android émet `beforeinstallprompt` qu'on met de côté pour le rejouer
 * sur clic bouton. Safari/iOS ne propose aucun prompt : on se contente de le
 * détecter pour afficher les instructions manuelles « Partager → écran
 * d'accueil ». On détecte aussi le mode standalone pour masquer l'UI une fois
 * l'app installée.
 */
export function usePwaInstall(): TPwaInstall {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Détection standalone : media query (Android/desktop) + `navigator.standalone` (iOS).
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);

    setIsIOS(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    // Chrome retient l'event : on l'empêche de s'afficher tout seul et on le
    // garde pour le rejouer quand l'utilisateur clique sur notre bouton.
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    // Une fois installée, on nettoie le prompt en attente.
    const onInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // Le prompt natif n'est utilisable qu'une fois : on le jette après usage.
    setDeferredPrompt(null);
  };

  return {
    canShow: !isInstalled,
    canPrompt: deferredPrompt !== null,
    isIOS,
    isInstalled,
    promptInstall,
  };
}
