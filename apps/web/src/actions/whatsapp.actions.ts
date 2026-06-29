'use server';

import { getUserAccount } from '@/services/account.service';
import { isWhatsAppConnected } from '@/services/whatsapp.service';
import { eq, getDBAdminClient, whatsappSessions } from '@alertdeals/db';
import {
  EGeneralErrorCode,
  EWhatsAppErrorCode,
  type TErrorCode,
} from '@alertdeals/shared';

// Session WhatsApp singleton : une seule row, PK fixe (voir schema).
const SESSION_ID = 'alertdeals';

/**
 * Garde admin partagée par les actions WhatsApp. La connexion appaire LE numéro
 * central AlertDeals (singleton) : réservé aux admins / super-admins. Défense en
 * profondeur — la page admin garde déjà l'accès, mais une server action est un
 * endpoint à part entière.
 */
async function assertAdmin(): Promise<boolean> {
  const account = await getUserAccount({ columnsToKeep: { adminRole: true } });
  return Boolean(account?.adminRole);
}

/**
 * Lance la connexion WhatsApp via le worker et renvoie le QR code (base64).
 * Le worker garde le socket Baileys vivant jusqu'au scan ou expiration (2 min)
 * et persiste la session au scan. Le front doit ensuite poller le statut.
 */
export const initiateWhatsAppConnection = async (): Promise<{
  success: boolean;
  qrCode?: string;
  errorCode?: TErrorCode;
}> => {
  if (!(await assertAdmin())) {
    return { success: false, errorCode: EGeneralErrorCode.FORBIDDEN };
  }

  try {
    // Repart d'un état « non connecté » pour que le polling ne voie pas un
    // ancien isConnected=true. La row est recréée/mise à jour par le worker au
    // scan (persistWhatsAppCredentials).
    const db = getDBAdminClient();
    await db
      .update(whatsappSessions)
      .set({ isConnected: false })
      .where(eq(whatsappSessions.id, SESSION_ID));

    // Délègue au worker : il crée le socket Baileys et renvoie le QR code.
    // Le worker est public (Vercel l'appelle depuis Internet) → on signe la
    // requête avec le secret partagé, vérifié par requireWorkerSecret.
    const response = await fetch(`${process.env.WORKER_URL}/whatsapp/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WORKER_SECRET}`,
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return {
        success: false,
        errorCode: result.error || EWhatsAppErrorCode.QR_GENERATION_FAILED,
      };
    }

    return { success: true, qrCode: result.qrCode };
  } catch {
    return { success: false, errorCode: EWhatsAppErrorCode.CONNECTION_FAILED };
  }
};

/**
 * Indique si la session WhatsApp est connectée. Appelé en polling par le front
 * après affichage du QR, pour détecter le scan réussi.
 */
export const checkWhatsAppConnected = async (): Promise<boolean> => {
  if (!(await assertAdmin())) return false;
  return isWhatsAppConnected();
};
