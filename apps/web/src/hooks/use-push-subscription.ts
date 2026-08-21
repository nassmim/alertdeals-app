'use client';

import { subscribeToPush, unsubscribeFromPush } from '@/actions/push.actions';
import { getErrorMessage } from '@/utils/error-messages.utils';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

// Clé publique VAPID (base64url), partagée avec le worker qui signe les push.
// `NEXT_PUBLIC_` car nécessaire côté navigateur pour s'abonner.
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

// L'API pushManager.subscribe attend l'applicationServerKey en Uint8Array ;
// on convertit la clé VAPID base64url (url-safe) en octets bruts.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(normalized);
  // Alloue un ArrayBuffer concret : `applicationServerKey` exige une BufferSource
  // adossée à un ArrayBuffer (pas un ArrayBufferLike générique).
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

type TPushSubscriptionState = {
  // Le navigateur supporte le push ET la clé VAPID est configurée.
  isSupported: boolean;
  // Un abonnement existe déjà pour cet appareil.
  isSubscribed: boolean;
  // Une opération d'abonnement/désabonnement est en cours.
  isBusy: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
};

/**
 * Gère l'abonnement Web Push de l'appareil courant : enregistrement du service
 * worker, demande de permission, souscription au PushManager, et persistance
 * de l'abonnement côté serveur (server action).
 *
 * Les échecs navigateur (permission refusée, souscription impossible) sont
 * signalés par toast ici même — ils n'ont pas de code d'erreur serveur. Les
 * erreurs de persistance remontent via `getErrorMessage`.
 */
export function usePushSubscription(): TPushSubscriptionState {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      Boolean(VAPID_PUBLIC_KEY);
    setIsSupported(supported);
    if (!supported) return;

    // Reflète l'état réel : un abonnement est-il déjà actif sur cet appareil ?
    // `ready` ne résout que si un SW est déjà enregistré (rien à faire sinon).
    //
    // L'abonnement navigateur peut exister SANS ligne en base (persistance qui
    // a échoué lors d'un essai précédent, compte différent…) : l'UI dirait
    // « activé » alors que le worker n'a aucun endpoint à notifier. On renvoie
    // donc systématiquement l'abonnement au serveur (upsert idempotent) et on
    // n'affiche « activé » que si la base est bien à jour.
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then(async (subscription) => {
        if (!subscription) {
          setIsSubscribed(false);
          return;
        }
        const result = await subscribeToPush(subscription.toJSON());
        setIsSubscribed('success' in result);
      })
      .catch(() => {});
  }, []);

  const enable = useCallback(async () => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return;
    setIsBusy(true);
    try {
      // La demande de permission doit être le PREMIER appel après le clic :
      // Safari iOS (et Chrome Android en « prompt discret ») n'affichent la
      // popup que si elle découle directement du geste utilisateur. Un `await`
      // placé avant (ex. register du SW) consomme cette activation → la demande
      // est refusée silencieusement.
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error(
          'Notifications refusées. Autorise-les dans les réglages de ton navigateur.',
        );
        return;
      }

      // Le SW est déjà enregistré au chargement (PwaSetup) ; on ré-enregistre
      // par sécurité puis on attend `ready` : `pushManager.subscribe` exige un SW
      // *actif*, or `register()` peut renvoyer une registration encore en cours
      // d'installation (première visite mobile) → InvalidStateError.
      await navigator.serviceWorker.register('/sw.js');
      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        // Obligatoire : garantit qu'un push affiche toujours une notif visible.
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const result = await subscribeToPush(subscription.toJSON());
      if ('error' in result) {
        toast.error(getErrorMessage(result.error));
        return;
      }

      setIsSubscribed(true);
      toast.success('Notifications activées sur cet appareil.');
    } catch (error) {
      console.error('[push] subscribe failed', error);
      toast.error("Impossible d'activer les notifications sur cet appareil.");
    } finally {
      setIsBusy(false);
    }
  }, [isSupported]);

  const disable = useCallback(async () => {
    setIsBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // On retire d'abord côté serveur, puis côté navigateur.
        await unsubscribeFromPush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
      toast.success('Notifications désactivées.');
    } catch {
      toast.error('Impossible de désactiver les notifications.');
    } finally {
      setIsBusy(false);
    }
  }, []);

  return { isSupported, isSubscribed, isBusy, enable, disable };
}
