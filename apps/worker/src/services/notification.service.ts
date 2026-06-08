import type { TAccount, TAlert } from '@alertdeals/db';
import { sendAlertMatchEmail } from './email.service.js';

// Préfixe visible dans la console pour repérer facilement les notifs simulées.
const MOCK_PREFIX = '[mock-notification]';

type TNotificationPayload = {
  accountId: string;
  alertId: string;
  alertName: string;
  newMatchesCount: number;
};

// Sous-ensemble du compte nécessaire pour router les notifs. `email` est NOT
// NULL côté DB (cf. account.schema). Le dispatcher reçoit ces champs depuis
// le daily-orchestrator qui les charge avec l'alerte.
type TAccountForNotification = Pick<TAccount, 'email'>;

// Compose le texte du log mock (canaux phone / whatsapp). L'email réel a son
// propre template HTML dans email.service.
function buildMockLogText({ alertName, newMatchesCount }: TNotificationPayload): string {
  const plural = newMatchesCount > 1 ? 'nouvelles annonces' : 'nouvelle annonce';
  const matchVerb = newMatchesCount > 1 ? 'matchent' : 'matche';
  return `Tu as ${newMatchesCount} ${plural} qui ${matchVerb} ton alerte "${alertName}".`;
}

/**
 * Envoi réel via Resend (fire-and-forget — on ne await pas dans le dispatcher
 * pour ne pas bloquer les autres canaux ou les autres users). Les erreurs sont
 * loggées dans email.service.
 */
export async function sendEmailMatchNotification(
  payload: TNotificationPayload,
  email: string,
): Promise<void> {
  await sendAlertMatchEmail({
    to: email,
    alertId: payload.alertId,
    alertName: payload.alertName,
    newMatchesCount: payload.newMatchesCount,
  });
}

// Mocks restants — pas de provider branché pour ces canaux.
export function sendPhoneMatchNotification(payload: TNotificationPayload): void {
  console.log(
    `${MOCK_PREFIX} phone → account=${payload.accountId} :: ${buildMockLogText(payload)}`,
  );
}

export function sendWhatsappMatchNotification(payload: TNotificationPayload): void {
  console.log(
    `${MOCK_PREFIX} whatsapp → account=${payload.accountId} :: ${buildMockLogText(payload)}`,
  );
}

/**
 * Dispatche une notif à l'utilisateur pour chaque canal coché sur son alerte.
 * Appelé une fois par alerte qui a reçu ≥ 1 nouveau match dans la run courante.
 *
 * Reste synchrone : l'envoi email tourne en fire-and-forget (void) pour ne pas
 * bloquer la boucle du daily-orchestrator (un envoi Resend lent ne doit pas
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
  if (channels.email) {
    // Fire-and-forget : on ne await pas pour ne pas bloquer le dispatch des
    // notifs suivantes. Les erreurs sont loggées dans email.service.
    void sendEmailMatchNotification(payload, account.email);
  }
  if (channels.phone) sendPhoneMatchNotification(payload);
  if (channels.whatsapp) sendWhatsappMatchNotification(payload);
}
