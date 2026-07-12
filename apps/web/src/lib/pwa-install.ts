// Store client léger pour l'installation PWA. Capture l'event
// `beforeinstallprompt` dès le chargement de l'app (et non seulement quand
// l'onglet réglages est monté, sinon l'event — émis tôt par Chrome — serait
// perdu) et partage son état avec le hook usePwaInstall.

// Event non standard émis par Chrome/Android quand l'app est installable.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let captured = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

// Branche la capture une seule fois (idempotent). Appelé au montage du layout.
export function initPwaInstallCapture(): void {
  if (captured) return;
  captured = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    // Empêche la mini-infobar Chrome : on déclenchera le prompt via notre bouton.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

// true si un prompt d'installation natif est en attente.
export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

// Déclenche le prompt natif puis le consomme (utilisable une seule fois).
export async function triggerInstallPrompt(): Promise<void> {
  if (!deferredPrompt) return;
  await deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  notify();
}

// S'abonne aux changements d'état (capture / installation). Renvoie un cleanup.
export function subscribePwaInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
