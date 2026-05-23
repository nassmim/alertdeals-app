import type { TAlert } from '@alertdeals/db';

// Préfixe visible dans la console pour repérer facilement les notifs simulées
const MOCK_PREFIX = '[mock-notification]';

type TNotificationPayload = {
  accountId: string;
  alertName: string;
  newMatchesCount: number;
};

// Compose le texte affiché à l'utilisateur. Accord en français selon le nombre.
function buildMessage({ alertName, newMatchesCount }: TNotificationPayload): string {
  const plural = newMatchesCount > 1 ? 'nouvelles annonces' : 'nouvelle annonce';
  const matchVerb = newMatchesCount > 1 ? 'matchent' : 'matche';
  return `Tu as ${newMatchesCount} ${plural} qui ${matchVerb} ton alerte "${alertName}".`;
}

// Trois mocks, un par canal. Même signature pour que le jour où on branche
// le vrai provider, le remplacement soit "find & replace" — pas de refacto
// côté orchestrator.
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

export function sendWhatsappMatchNotification(payload: TNotificationPayload): void {
  console.log(
    `${MOCK_PREFIX} whatsapp → account=${payload.accountId} :: ${buildMessage(payload)}`,
  );
}

/**
 * Dispatche une notif à l'utilisateur pour chaque canal coché sur son alerte.
 * Appelé une fois par alerte qui a reçu ≥ 1 nouveau match dans la run courante.
 */
export function dispatchAlertMatchNotifications(args: {
  accountId: string;
  alert: Pick<TAlert, 'id' | 'name' | 'notificationChannels'>;
  newMatchesCount: number;
}): void {
  const { accountId, alert, newMatchesCount } = args;
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
  if (channels.whatsapp) sendWhatsappMatchNotification(payload);
}
