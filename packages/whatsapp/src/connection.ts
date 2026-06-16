import { eq, getDBAdminClient, whatsappSessions } from '@alertdeals/db';
import {
  decryptCredentials,
  encryptCredentials,
  EWhatsAppErrorCode,
} from '@alertdeals/shared';
import { Boom } from '@hapi/boom';
import makeWASocket, {
  AuthenticationState,
  BufferJSON,
  DisconnectReason,
  initAuthCreds,
  SignalDataTypeMap,
} from '@whiskeysockets/baileys';
import {
  ConnectionWaitResult,
  CredentialConnectionResult,
  QRConnectionResult,
  StoredAuthState,
  WhatsAppEventHandlers,
} from './types';

// PK fixe de la singleton row dans `whatsapp_sessions` — voir schema.
const SESSION_ID = 'alertdeals';

const QR_TIMEOUT_MS = 120_000;
const CONNECTION_TIMEOUT_MS = 30_000;

// Codes de déconnexion qui veulent dire "session morte, faut re-pair" —
// inutile de retry, ça ne reviendra pas tout seul.
const PERMANENT_DISCONNECT_CODES = new Set<number>([
  DisconnectReason.loggedOut,
  DisconnectReason.badSession,
  DisconnectReason.multideviceMismatch,
  DisconnectReason.forbidden,
]);

// Baileys retourne des logs très verbeux par défaut ; on les coupe sauf erreur
// remontée par notre code.
const noop = () => {};
const silentLogger = {
  level: 'silent',
  child() {
    return silentLogger;
  },
  trace: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
} as unknown as Parameters<typeof makeWASocket>[0]['logger'];

// Workaround d'un rejet 405 côté WhatsApp si on annonce une version trop
// récente — pin sur une combo testée. Source :
// https://github.com/WhiskeySockets/Baileys/issues/2370
const WA_SOCKET_CONFIG = {
  printQRInTerminal: false,
  version: [2, 3000, 1033893291] as [number, number, number],
  browser: ['AlertDeals', 'Chrome', '145.0.0'] as [string, string, string],
  syncFullHistory: false,
  markOnlineOnConnect: false,
  logger: silentLogger,
};

function getEncryptionKey(): string {
  const key = process.env.WHATSAPP_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('WHATSAPP_ENCRYPTION_KEY env var is not set');
  }
  return key;
}

/**
 * Construit l'auth state Baileys depuis la session stockée (ou vide si pas
 * encore pair). Retourne `state` pour Baileys, `saveState` pour ré-encrypter
 * vers la DB, et `updateCreds` pour absorber les `creds.update` émis par
 * Baileys pendant la vie du socket.
 */
export const createDBAuthState = (
  storedState: StoredAuthState | null,
): {
  state: AuthenticationState;
  saveState: () => StoredAuthState;
  updateCreds: (updated: Partial<ReturnType<typeof initAuthCreds>>) => void;
} => {
  const encryptionKey = getEncryptionKey();

  let creds = initAuthCreds();
  let keys: Record<string, Record<string, unknown>> = {};

  if (storedState) {
    try {
      const decryptedCreds = decryptCredentials(storedState.creds, encryptionKey);
      creds = JSON.parse(decryptedCreds, BufferJSON.reviver);

      const decryptedKeys = decryptCredentials(storedState.keys, encryptionKey);
      keys = JSON.parse(decryptedKeys, BufferJSON.reviver);
    } catch (error) {
      throw new Error(
        `${EWhatsAppErrorCode.SESSION_DECRYPT_FAILED}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  const state: AuthenticationState = {
    creds,
    keys: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (type: any, ids: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: Record<string, any> = {};
        for (const id of ids) {
          const value = keys[type]?.[id];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (value) data[id] = value as any;
        }
        return data;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      set: (data: any) => {
        for (const category in data) {
          const categoryData = data[category as keyof SignalDataTypeMap];
          if (!categoryData) continue;
          if (!keys[category]) keys[category] = {};
          for (const id in categoryData) {
            const value = categoryData[id];
            if (value) {
              keys[category][id] = value;
            } else {
              delete keys[category][id];
            }
          }
        }
      },
    },
  };

  const saveState = (): StoredAuthState => {
    const credsJson = JSON.stringify(creds, BufferJSON.replacer);
    const keysJson = JSON.stringify(keys, BufferJSON.replacer);
    return {
      creds: encryptCredentials(credsJson, encryptionKey),
      keys: encryptCredentials(keysJson, encryptionKey),
    };
  };

  const updateCreds = (
    updated: Partial<ReturnType<typeof initAuthCreds>>,
  ): void => {
    creds = { ...creds, ...updated };
    state.creds = creds;
  };

  return { state, saveState, updateCreds };
};

/**
 * Mode QR : utilisé une seule fois par le script CLI de pairing. Baileys émet
 * un QR à scanner ; après le scan, on doit ré-ouvrir le socket (restart=515)
 * pour finaliser la connexion, puis appeler `handlers.onConnected`.
 */
export const createWhatsAppConnection = async (
  storedState: StoredAuthState | null,
  handlers: WhatsAppEventHandlers,
): Promise<QRConnectionResult> => {
  const { state, saveState, updateCreds } = createDBAuthState(storedState);

  let qrTimeout: NodeJS.Timeout | null = null;
  let isCleanedUp = false;

  const socket = makeWASocket({ ...WA_SOCKET_CONFIG, auth: state });

  socket.ev.on('creds.update', (updated) => updateCreds(updated));

  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    if (qrTimeout) {
      clearTimeout(qrTimeout);
      qrTimeout = null;
    }
    socket.end(undefined);
  };

  qrTimeout = setTimeout(() => {
    if (!isCleanedUp) {
      handlers.onError('QR code expired. Please try again.');
      cleanup();
    }
  }, QR_TIMEOUT_MS);

  socket.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) handlers.onQRCode(qr);

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      // 515 = restartRequired : Baileys demande de ré-ouvrir le socket
      // post-pairing pour récupérer une session stable. C'est normal.
      const shouldReconnect =
        statusCode === DisconnectReason.restartRequired || statusCode === 515;

      if (shouldReconnect && !isCleanedUp) {
        setTimeout(() => {
          const newSocket = makeWASocket({ ...WA_SOCKET_CONFIG, auth: state });
          newSocket.ev.on('creds.update', (updated) => updateCreds(updated));
          newSocket.ev.on('connection.update', (newUpdate) => {
            if (newUpdate.connection === 'open') {
              if (qrTimeout) {
                clearTimeout(qrTimeout);
                qrTimeout = null;
              }
              handlers.onConnected();
            } else if (newUpdate.connection === 'close') {
              handlers.onDisconnected('Connection closed after reconnect');
            }
          });
        }, 1000);
      } else if (statusCode === DisconnectReason.loggedOut) {
        handlers.onDisconnected('Logged out of WhatsApp');
      } else if (!shouldReconnect) {
        handlers.onDisconnected('Connection closed');
      }
    }

    if (connection === 'open') {
      if (qrTimeout) {
        clearTimeout(qrTimeout);
        qrTimeout = null;
      }
      handlers.onConnected();
    }
  });

  return { socket, saveState, cleanup };
};

/**
 * Mode credentials : utilisé par le worker au boot. Pas de QR, on reload la
 * session paire et on attend l'ouverture du socket. `waitForConnection` permet
 * au caller de savoir si on est UP avant de tenter un envoi.
 */
export const connectWithCredentials = async (
  storedState: StoredAuthState,
): Promise<CredentialConnectionResult> => {
  const { state, saveState, updateCreds } = createDBAuthState(storedState);

  const socket = makeWASocket({ ...WA_SOCKET_CONFIG, auth: state });
  socket.ev.on('creds.update', (updated) => updateCreds(updated));

  let connectionResolve: ((value: ConnectionWaitResult) => void) | null = null;
  let connectionTimeout: NodeJS.Timeout | null = null;
  let isCleanedUp = false;

  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }
    socket.end(undefined);
  };

  const waitForConnection = (): Promise<ConnectionWaitResult> => {
    return new Promise((resolve) => {
      connectionResolve = resolve;
      connectionTimeout = setTimeout(() => {
        if (connectionResolve) {
          connectionResolve({ connected: false, permanent: false });
          connectionResolve = null;
        }
      }, CONNECTION_TIMEOUT_MS);
    });
  };

  const resolveConnection = (value: ConnectionWaitResult) => {
    if (!connectionResolve) return;
    if (connectionTimeout) {
      clearTimeout(connectionTimeout);
      connectionTimeout = null;
    }
    connectionResolve(value);
    connectionResolve = null;
  };

  socket.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      resolveConnection({ connected: true, permanent: false });
      return;
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;

      // Auto-reconnect 1× sur restartRequired — c'est normal après une
      // période d'inactivité du socket.
      if (statusCode === DisconnectReason.restartRequired && !isCleanedUp) {
        const newSocket = makeWASocket({ ...WA_SOCKET_CONFIG, auth: state });
        newSocket.ev.on('creds.update', (updated) => updateCreds(updated));
        newSocket.ev.on('connection.update', (newUpdate) => {
          if (newUpdate.connection === 'open') {
            resolveConnection({ connected: true, permanent: false });
          } else if (newUpdate.connection === 'close') {
            resolveConnection({ connected: false, permanent: false });
          }
        });
        return;
      }

      const isPermanent =
        typeof statusCode === 'number' && PERMANENT_DISCONNECT_CODES.has(statusCode);
      resolveConnection({ connected: false, permanent: isPermanent });
    }
  });

  return { socket, saveState, waitForConnection, cleanup };
};

/**
 * Lit la singleton row `whatsapp_sessions` et renvoie l'état stocké.
 * Retourne `null` si la table est vide → caller doit lancer le pairing.
 */
export async function loadStoredCredentials(): Promise<StoredAuthState | null> {
  const db = getDBAdminClient();
  const row = await db.query.whatsappSessions.findFirst({
    where: eq(whatsappSessions.id, SESSION_ID),
  });
  if (!row?.credentials) return null;
  return JSON.parse(row.credentials) as StoredAuthState;
}

/**
 * Upsert de la session encryptée dans la singleton row. Appelé après chaque
 * `saveState()` post-pairing OU après un envoi réussi (Baileys peut avoir
 * mis à jour les creds via `creds.update`).
 */
export async function persistWhatsAppCredentials(
  credentials: StoredAuthState,
): Promise<void> {
  const db = getDBAdminClient();
  await db
    .insert(whatsappSessions)
    .values({
      id: SESSION_ID,
      credentials: JSON.stringify(credentials),
      isConnected: true,
      isDisconnected: false,
      lastConnectedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: whatsappSessions.id,
      set: {
        credentials: JSON.stringify(credentials),
        isConnected: true,
        isDisconnected: false,
        lastConnectedAt: new Date(),
        updatedAt: new Date(),
      },
    });
}

/**
 * Marque la session comme déconnectée. Appelé sur erreurs permanentes
 * (loggedOut/badSession) pour signaler qu'un re-pair est nécessaire.
 */
export async function markWhatsAppAsDisconnected(): Promise<void> {
  const db = getDBAdminClient();
  await db
    .update(whatsappSessions)
    .set({
      isDisconnected: true,
      isConnected: false,
      updatedAt: new Date(),
    })
    .where(eq(whatsappSessions.id, SESSION_ID));
}
