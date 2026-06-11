import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// AES-256-GCM : algo authentifié → on chiffre + on signe en une seule passe.
// L'authTag détecte toute altération du payload au déchiffrement (sinon throw).
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Chiffre une chaîne en AES-256-GCM.
 * @param data - String à chiffrer (typiquement le JSON des creds Baileys).
 * @param key - Clé 32 octets fournie en hex (64 caractères) — env WHATSAPP_ENCRYPTION_KEY.
 * @returns Base64 contenant : iv (16) + authTag (16) + payload chiffré.
 */
export const encryptCredentials = (data: string, key: string): string => {
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (64 hex characters)');
  }

  // IV aléatoire à chaque chiffrement — interdit de réutiliser un IV en GCM
  // sinon on casse la garantie d'authentification.
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Concat dans un ordre fixe → on saura les ré-extraire au déchiffrement
  // sans devoir stocker leurs longueurs.
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(encrypted, 'base64'),
  ]);

  return combined.toString('base64');
};

/**
 * Déchiffre une chaîne produite par `encryptCredentials`.
 * Throw si l'authTag ne match pas (payload altéré ou mauvaise clé).
 */
export const decryptCredentials = (encryptedData: string, key: string): string => {
  const keyBuffer = Buffer.from(key, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (64 hex characters)');
  }

  const combined = Buffer.from(encryptedData, 'base64');

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
};

/**
 * Génère une clé aléatoire 32 octets en hex.
 * Utiliser une seule fois pour initialiser WHATSAPP_ENCRYPTION_KEY dans Infisical.
 */
export const generateEncryptionKey = (): string => {
  return randomBytes(32).toString('hex');
};
