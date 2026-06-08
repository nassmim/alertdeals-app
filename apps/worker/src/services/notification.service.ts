import type { TAccount, TAlert } from '@alertdeals/db';
import { getWhatsAppJID, sendWhatsAppMessage } from '@alertdeals/whatsapp';
import { getWhatsAppSocket } from './whatsapp.service.js';

// Préfixe visible dans la console pour repérer les notifs simulées (les
// canaux email/phone restent mockés).
const MOCK_PREFIX = '[mock-notification]';

type TNotificationPayload = {
  accountId: string;
  alertId: string;
  alertName: string;
  newMatchesCount: number;
};

// URL publique du site En dev
// `http://localhost:${WEB_PORT}` (5100), en prod l'URL prod d'alertdeals.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
if (!SITE_URL) {
  throw new Error('NEXT_PUBLIC_SITE_URL is required to build notification links');
}

// Route de la page hot-deals + nom du query param qui filtre par alerte.
// Dupliqué ici parce que le worker ne peut pas importer depuis @alertdeals/web
const HOT_DEALS_PATH = '/dashboard/hot-deals';
const HOT_DEALS_ALERT_PARAM = 'alert';

// Construit le lien envoyé dans la notif : pointe sur les hot-deals filtrés
// par l'alerte concernée, pour que le user atterrisse directement sur les
// nouvelles annonces qui matchent.
function buildHotDealsUrl(alertId: string): string {
  return `${SITE_URL}${HOT_DEALS_PATH}?${HOT_DEALS_ALERT_PARAM}=${alertId}`;
}

// Sous-ensemble du compte nécessaire pour router la notif WhatsApp (numéro
// perso ou ID de groupe). Le dispatcher reçoit déjà ces champs depuis le
// daily-orchestrator qui les charge avec l'alerte.
type TAccountForNotification = Pick<TAccount, 'whatsappPhoneNumber' | 'whatsappIsGroup'>;

// Compose le texte affiché à l'utilisateur. Copy validé produit (cf. ticket
// "envoi message WhatsApp simple") — ne pas changer le wording sans validation.
// Accord singulier/pluriel géré pour rester naturel à la lecture.
function buildMessage({ alertId, alertName, newMatchesCount }: TNotificationPayload): string {
  const isPlural = newMatchesCount > 1;
  const opportunityWord = isPlural ? 'nouvelles opportunités' : 'nouvelle opportunité';
  const verbWord = isPlural ? 'viennent' : 'vient';
  const url = buildHotDealsUrl(alertId);
  return (
    `Salut c'est ton compagnon AlertDeals !\n` +
    `${newMatchesCount} ${opportunityWord} matchant les critères de sélection de ton alerte "${alertName}" ${verbWord} d'arriver ! ` +
    `Ne perds pas une seconde, ces hot deals ne restent pas longtemps !\n` +
    `${url}`
  );
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
 * Récupère le socket singleton (lazy connect
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
    alertId: alert.id,
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
