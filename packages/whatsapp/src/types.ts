import { WASocket } from '@whiskeysockets/baileys';

// État Baileys encrypté tel que stocké en DB. Sérialisé en JSON dans la
// colonne `credentials` de la table `whatsapp_sessions`.
export type StoredAuthState = {
  creds: string;
  keys: string;
};

// Callbacks utilisés par le flow QR (pairing CLI). Aucune dépendance UI,
// le caller décide comment afficher le QR (terminal, log, etc.).
export type WhatsAppEventHandlers = {
  onQRCode: (qrString: string) => void;
  onConnected: () => void;
  onDisconnected: (reason: string) => void;
  onError: (error: string) => void;
};

// Résultat de `waitForConnection`.
//  - permanent=true → loggedOut / badSession / forbidden : ne pas retry, la
//    session est morte et il faut re-pair.
//  - permanent=false → transient (réseau, restart) : on peut retenter.
export type ConnectionWaitResult = {
  connected: boolean;
  permanent: boolean;
};

export type CredentialConnectionResult = {
  socket: WASocket;
  saveState: () => StoredAuthState;
  waitForConnection: () => Promise<ConnectionWaitResult>;
  cleanup: () => void;
};

export type QRConnectionResult = {
  socket: WASocket;
  saveState: () => StoredAuthState;
  cleanup: () => void;
};
