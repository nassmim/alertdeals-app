import { eq, getDBAdminClient, pushSubscriptions } from "@alertdeals/db";
import webpush from "web-push";

// Lit une variable d'env et throw si manquante (même helper que email.service).
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

// Clés VAPID : identifient AlertDeals auprès des services de push et signent
// chaque envoi. La publique doit correspondre à NEXT_PUBLIC_VAPID_PUBLIC_KEY
// côté web. VAPID_SUBJECT = contact (mailto:… ou URL) exigé par le protocole.
const VAPID_PUBLIC_KEY = requireEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = requireEnv("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = requireEnv("VAPID_SUBJECT");
const SITE_URL = requireEnv("NEXT_PUBLIC_SITE_URL");

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Route + query param qui filtre les hot-deals par alerte. Dupliqué comme dans
// email.service (le worker ne peut pas importer depuis @alertdeals/web).
const HOT_DEALS_PATH = "/dashboard/hot-deals";
const HOT_DEALS_ALERT_PARAM = "alert";

type TPushMatchPayload = {
  accountId: string;
  alertId: string;
  alertName: string;
  newMatchesCount: number;
};

// Colonnes d'un abonnement nécessaires à l'envoi + à la purge.
type TStoredSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Pousse une notif de match d'alerte sur tous les appareils abonnés d'un
 * compte. Remplace l'ancien canal "phone" mocké.
 *
 * Ne throw pas : appelé en fire-and-forget depuis le dispatcher, un échec pour
 * un user ne doit pas bloquer les autres canaux/users. Les abonnements morts
 * (404/410) sont purgés au passage.
 */
export async function sendPushMatchNotification(
  payload: TPushMatchPayload,
): Promise<void> {
  const db = getDBAdminClient();

  const subscriptions = await db.query.pushSubscriptions.findMany({
    columns: { id: true, endpoint: true, p256dh: true, auth: true },
    where: eq(pushSubscriptions.accountId, payload.accountId),
  });
  if (subscriptions.length === 0) return;

  const url = `${SITE_URL}${HOT_DEALS_PATH}?${HOT_DEALS_ALERT_PARAM}=${payload.alertId}`;
  const isPlural = payload.newMatchesCount > 1;
  const opportunityWord = isPlural
    ? "nouvelles opportunités"
    : "nouvelle opportunité";
  // Le nom de l'app est déjà affiché par l'OS/navigateur en en-tête de la notif
  // ("via AlertDeals") : on met l'info utile dans le titre pour ne pas répéter.
  const notification = JSON.stringify({
    title: `${payload.newMatchesCount} ${opportunityWord}`,
    body: `Pour ton alerte "${payload.alertName}"`,
    url,
  });

  // Envois en parallèle — chaque appareil est indépendant.
  await Promise.all(subscriptions.map((sub) => sendToOne(sub, notification)));
}

// Envoie à un seul appareil et purge l'abonnement s'il est expiré/révoqué.
async function sendToOne(
  subscription: TStoredSubscription,
  notification: string,
): Promise<void> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      notification,
    );
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    // 404 (introuvable) / 410 (Gone) = l'abonnement n'existe plus côté service
    // de push → on le supprime pour ne plus le retenter.
    if (statusCode === 404 || statusCode === 410) {
      const db = getDBAdminClient();
      await db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.id, subscription.id));
      return;
    }
    console.error(
      `[push.service] send failed for endpoint=${subscription.endpoint}`,
      error instanceof Error ? error.message : error,
    );
  }
}
