import { EWhatsAppErrorCode } from '@alertdeals/shared';
import {
  CredentialConnectionResult,
  connectWithCredentials,
  loadStoredCredentials,
  markWhatsAppAsDisconnected,
  persistWhatsAppCredentials,
  type WASocket,
} from '@alertdeals/whatsapp';

// Singleton socket pour ce process worker. Lazy : on ne se connecte qu'à
// la première demande d'envoi — ça évite de planter le boot du worker si
// le pairing n'a pas encore eu lieu (env nouvellement déployé, session
// révoquée, etc.).
let socketPromise: Promise<WASocket> | null = null;
let activeConnection: CredentialConnectionResult | null = null;

/**
 * Récupère le socket WhatsApp prêt à envoyer. Réutilise la connexion en
 * cours si elle est ouverte, sinon en ouvre une nouvelle via la session
 * encryptée stockée en DB.
 *
 * Throw :
 *  - `SESSION_NOT_PAIRED` si la table `whatsapp_sessions` est vide → il faut
 *    lancer `pnpm pair-whatsapp` avant.
 *  - `MESSAGE_SEND_FAILED` si la connexion n'aboutit pas (transient ou
 *    permanente — voir markWhatsAppAsDisconnected pour le distinguer en DB).
 */
export async function getWhatsAppSocket(): Promise<WASocket> {
  if (socketPromise) return socketPromise;
  socketPromise = openConnection();
  return socketPromise;
}

async function openConnection(): Promise<WASocket> {
  const storedState = await loadStoredCredentials();
  if (!storedState) {
    // Libère le singleton avant de throw — le prochain appel pourra retenter
    // (par exemple après que le boss ait fait `pnpm pair-whatsapp`).
    socketPromise = null;
    throw new Error(EWhatsAppErrorCode.SESSION_NOT_PAIRED);
  }

  const conn = await connectWithCredentials(storedState);
  const result = await conn.waitForConnection();

  if (!result.connected) {
    // permanent = loggedOut / badSession / forbidden : la session est morte,
    // on marque la row en DB et on attend un re-pair. transient = on
    // libère juste le singleton, l'appel suivant retentera.
    if (result.permanent) {
      await markWhatsAppAsDisconnected();
    }
    conn.cleanup();
    socketPromise = null;
    throw new Error(EWhatsAppErrorCode.MESSAGE_SEND_FAILED);
  }

  activeConnection = conn;

  // Persiste immédiatement les credentials post-connect : Baileys peut avoir
  // rafraîchi des clés pendant le handshake, et on veut que le prochain boot
  // reload une session à jour.
  try {
    await persistWhatsAppCredentials(conn.saveState());
  } catch (error) {
    console.error('[whatsapp.service] post-connect persist failed', error);
  }

  // Pendant la vie du socket, Baileys peut renouveler des clés en background ;
  // on resave à chaque event pour ne pas perdre l'état si le worker redémarre.
  conn.socket.ev.on('creds.update', async () => {
    try {
      await persistWhatsAppCredentials(conn.saveState());
    } catch (error) {
      console.error('[whatsapp.service] creds.update persist failed', error);
    }
  });

  // Si le socket ferme en cours de route (réseau, restart, etc.), on libère
  // le singleton pour que le prochain getWhatsAppSocket() retente proprement.
  conn.socket.ev.on('connection.update', (update) => {
    if (update.connection === 'close') {
      console.warn('[whatsapp.service] socket closed, will reconnect on demand');
      socketPromise = null;
      activeConnection = null;
    }
  });

  return conn.socket;
}

/**
 * Ferme proprement le socket et libère le singleton. À appeler depuis le
 * graceful shutdown du worker pour éviter de laisser une connexion zombie.
 */
export function closeWhatsAppSocket(): void {
  if (activeConnection) {
    activeConnection.cleanup();
    activeConnection = null;
    socketPromise = null;
  }
}
