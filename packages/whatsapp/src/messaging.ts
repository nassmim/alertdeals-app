import { EWhatsAppErrorCode } from '@alertdeals/shared';
import { WASocket } from '@whiskeysockets/baileys';

type TSendResult = { success: true } | { success: false; errorCode: EWhatsAppErrorCode };

/**
 * Envoi d'un message texte via Baileys.
 *
 * Pour un destinataire individuel on vérifie via `onWhatsApp(jid)` que le numéro
 * existe vraiment sur WhatsApp — évite d'envoyer dans le vide si le user a
 * renseigné un faux numéro côté settings.
 * Pour un groupe (suffix `@g.us`) on skip la vérif : `onWhatsApp` ne supporte
 * pas les JIDs de groupes, et un groupe auquel le numéro central est ajouté
 * est forcément joignable.
 */
export const sendWhatsAppMessage = async (
  socket: WASocket,
  jid: string,
  message: string,
): Promise<TSendResult> => {
  try {
    const isGroup = jid.endsWith('@g.us');

    if (!isGroup) {
      const results = await socket.onWhatsApp(jid);
      const result = results?.[0];
      if (!result?.exists) {
        return { success: false, errorCode: EWhatsAppErrorCode.RECIPIENT_PHONE_INVALID };
      }
      // Le JID normalisé renvoyé par WhatsApp peut différer (ex. ajout du
      // pays) — on utilise toujours celui-là pour l'envoi.
      await socket.sendMessage(result.jid, { text: message });
      return { success: true };
    }

    await socket.sendMessage(jid, { text: message });
    return { success: true };
  } catch (error) {
    console.error(
      '[whatsapp] sendMessage error:',
      error instanceof Error ? error.message : error,
    );
    return { success: false, errorCode: EWhatsAppErrorCode.MESSAGE_SEND_FAILED };
  }
};

/**
 * Construit un JID WhatsApp depuis un numéro de tel OU un ID de groupe.
 *  - perso : "+33612345678" → "33612345678@s.whatsapp.net"
 *  - groupe : "120363012345678901" → "120363012345678901@g.us"
 *
 * Le flag `isGroup` vient de `accounts.whatsappIsGroup` (settings WhatsApp).
 */
export function getWhatsAppJID(phoneOrGroupId: string, isGroup: boolean): string {
  if (isGroup) {
    // Les IDs de groupe sont des chaînes numériques pures ; on retire un
    // éventuel suffixe `@g.us` déjà collé par le user.
    const cleaned = phoneOrGroupId.replace(/@g\.us$/, '');
    return `${cleaned}@g.us`;
  }
  // Numéro perso : on enlève juste le `+` initial s'il est là.
  const cleaned = phoneOrGroupId.replace(/^\+/, '');
  return `${cleaned}@s.whatsapp.net`;
}
