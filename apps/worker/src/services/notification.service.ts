import type { TAccount, TAlert } from '@alertdeals/db';
import { getWhatsAppJID, sendWhatsAppMessage } from '@alertdeals/whatsapp';
import { getWhatsAppSocket } from './whatsapp.service.js';

// Préfixe visible dans la console pour repérer les notifs simulées (les
// canaux email/phone restent mockés).
const MOCK_PREFIX = '[mock-notification]';

type TNotificationPayload = {
  accountId: string;
  alertName: string;
  newMatchesCount: number;
};

// Sous-ensemble du compte nécessaire pour router la notif WhatsApp (numéro
// perso ou ID de groupe). Le dispatcher reçoit déjà ces champs depuis le
// daily-orchestrator qui les charge avec l'alerte.
type TAccountForNotification = Pick<TAccount, 'whatsappPhoneNumber' | 'whatsappIsGroup'>;

// Compose le texte affiché à l'utilisateur. Accord en français selon le nombre.
function buildMessage({ alertName, newMatchesCount }: TNotificationPayload): string {
  const plural = newMatchesCount > 1 ? 'nouvelles annonces' : 'nouvelle annonce';
  const matchVerb = newMatchesCount > 1 ? 'matchent' : 'matche';
  return `Tu as ${newMatchesCount} ${plural} qui ${matchVerb} ton alerte "${alertName}".`;
}

// Email / phone restent mockés — pas de provider branché pour l'instant.
export function sendEmailMatchNotification(payload: TNotificationPayload): void {
  console.log(
    `${MOCK_PREFIX} email → account=${payload.accountId} :: ${buildMessage(payload)}`,
  );
}

export function sendPhoneMatchNotification(payload: TNotificationPayload): void {
  console.log(
    `${MOCK_PREFIX} phone → account=${payload.accountId} :: ${buildMessage(payload)}`,
  );
}

/**
 * Envoi WhatsApp réel via Baileys. Récupère le socket singleton (lazy connect
 * à la première utilisation), construit le JID depuis le numéro/groupe du
 * user, et envoie le message.
 *
 * Loggue les erreurs mais ne throw pas : un échec WhatsApp pour un user ne
 * doit pas bloquer les notifs des autres canaux ou des autres users.
 */
export async function sendWhatsappMatchNotification(
  payload: TNotificationPayload,
  whatsappPhoneNumber: string,
  whatsappIsGroup: boolean,
): Promise<void> {
  try {
    const socket = await getWhatsAppSocket();
    const jid = getWhatsAppJID(whatsappPhoneNumber, whatsappIsGroup);
    const result = await sendWhatsAppMessage(socket, jid, buildMessage(payload));
    if (!result.success) {
      console.error(
        `[notification] WhatsApp send failed for account=${payload.accountId} :: ${result.errorCode}`,
      );
    }
  } catch (error) {
    console.error(
      `[notification] WhatsApp dispatch error for account=${payload.accountId}`,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Dispatche une notif à l'utilisateur pour chaque canal coché sur son alerte.
 * Appelé une fois par alerte qui a reçu ≥ 1 nouveau match dans la run courante.
 *
 * Reste synchrone : les envois WhatsApp tournent en fire-and-forget pour ne
 * pas bloquer la boucle du daily-orchestrator (un user lent ne doit pas
 * retarder les notifs des suivants).
 */
export function dispatchAlertMatchNotifications(args: {
  accountId: string;
  account: TAccountForNotification;
  alert: Pick<TAlert, 'id' | 'name' | 'notificationChannels'>;
  newMatchesCount: number;
}): void {
  const { accountId, account, alert, newMatchesCount } = args;
  if (newMatchesCount === 0) return;

  const payload: TNotificationPayload = {
    accountId,
    // `alert.name` est nullable dans le schéma (alerte sans nom autorisée côté form).
    alertName: alert.name ?? 'Alerte sans nom',
    newMatchesCount,
  };

  const channels = alert.notificationChannels;
  if (channels.email) sendEmailMatchNotification(payload);
  if (channels.phone) sendPhoneMatchNotification(payload);

  // WhatsApp n'est tenté que si le user a renseigné son numéro/groupe dans
  // les settings (sinon getWhatsAppJID renverrait un JID bidon).
  if (channels.whatsapp && account.whatsappPhoneNumber) {
    // Fire-and-forget : on ne await pas pour ne pas bloquer le dispatch des
    // notifs suivantes. Les erreurs sont loggées dans sendWhatsappMatchNotification.
    void sendWhatsappMatchNotification(
      payload,
      account.whatsappPhoneNumber,
      account.whatsappIsGroup,
    );
  }
}
