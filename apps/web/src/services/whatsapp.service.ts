import { getDBAdminClient, whatsappSessions } from '@alertdeals/db';

// Session WhatsApp singleton : une seule row, PK fixe (voir schema).
const SESSION_ID = 'alertdeals';

export type TWhatsappSessionStatus = {
  isConnected: boolean;
  isDisconnected: boolean;
};

/**
 * Lit l'état de la session WhatsApp centrale (singleton).
 *
 * La table `whatsapp_sessions` est en « deny all » pour le rôle authentifié
 * (gérée par le worker seul), donc on passe par le client admin (hors RLS).
 * L'accès est gardé en amont : ce service n'est appelé que depuis des contextes
 * admin (page admin + server actions).
 */
export async function getWhatsappSessionStatus(): Promise<TWhatsappSessionStatus> {
  const db = getDBAdminClient();
  const session = await db.query.whatsappSessions.findFirst({
    where: (table, { eq }) => eq(table.id, SESSION_ID),
    columns: { isConnected: true, isDisconnected: true },
  });

  return {
    isConnected: session?.isConnected ?? false,
    isDisconnected: session?.isDisconnected ?? false,
  };
}

/**
 * Raccourci pour le polling front : true si la session WhatsApp est connectée.
 */
export async function isWhatsAppConnected(): Promise<boolean> {
  const { isConnected } = await getWhatsappSessionStatus();
  return isConnected;
}
