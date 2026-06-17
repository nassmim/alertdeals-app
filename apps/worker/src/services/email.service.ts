import { Resend } from 'resend';

// Lit une variable d'env et throw si manquante. Le helper renvoie `string`
// (non-nullable) pour que TS propage le type dans les closures plus bas — un
// simple `if (!X) throw` ne suffit pas à narrow le type d'une const-module
// utilisée dans une fonction définie ensuite.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

// URL publique du site, partagée avec le web via `.env` racine. En dev pointe
// sur `http://localhost:5100`, en prod sur l'URL prod d'alertdeals.
const SITE_URL = requireEnv('NEXT_PUBLIC_SITE_URL');

// Clé API Resend (côté boss, valeur transmise via secret manager).
const RESEND_API_KEY = requireEnv('RESEND_API_KEY');

// Adresse "From" affichée au destinataire. Format Resend attendu :
// `"L'équipe AlertDeals <hello@alertdeals.fr>"`. Le domaine doit être
// vérifié sur Resend en prod ; en dev on utilise `onboarding@resend.dev`.
const RESEND_FROM_EMAIL = requireEnv('RESEND_FROM_EMAIL');

// Route + query param qui filtre les hot-deals par alerte. Dupliqué ici parce
// que le worker ne peut pas importer depuis @alertdeals/web (couplage interdit).
// À garder synchro avec `HOT_DEALS_FILTER_PARAMS.alert` côté web.
const HOT_DEALS_PATH = '/dashboard/hot-deals';
const HOT_DEALS_ALERT_PARAM = 'alert';

// Sujet validé produit (cf. ticket "mail d'alerte simple").
const EMAIL_SUBJECT = 'Ton alerte quotidienne';

// Client Resend partagé pour la durée de vie du worker. Lazy serait inutile
// ici, on a déjà checké la clé au module-load.
const resend = new Resend(RESEND_API_KEY);

type TAlertMatchEmailPayload = {
  to: string;
  alertId: string;
  alertName: string;
  newMatchesCount: number;
};

/**
 * Envoie le mail "ton alerte quotidienne" à un user pour lequel le
 * daily-orchestrator a détecté ≥1 nouveau match.
 *
 * Loggue les erreurs Resend mais ne throw pas : un échec d'envoi pour un user
 * ne doit pas bloquer le dispatch des autres canaux ou des autres users.
 */
export async function sendAlertMatchEmail(
  payload: TAlertMatchEmailPayload,
): Promise<void> {
  const { to, alertId, alertName, newMatchesCount } = payload;
  const hotDealsUrl = `${SITE_URL}${HOT_DEALS_PATH}?${HOT_DEALS_ALERT_PARAM}=${alertId}`;

  try {
    const result = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to,
      subject: EMAIL_SUBJECT,
      html: buildHtml({ alertName, newMatchesCount, hotDealsUrl }),
    });

    if (result.error) {
      console.error(
        `[email.service] Resend returned error for to=${to} :: ${result.error.message}`,
      );
    }
  } catch (error) {
    console.error(
      `[email.service] sendAlertMatchEmail threw for to=${to}`,
      error instanceof Error ? error.message : error,
    );
  }
}

// HTML inline (pas de framework template, c'est un mail de 4 lignes + un
// bouton). Les couleurs et styles sont durs en inline-style parce que les
// clients mail (Gmail, Outlook) strippent souvent les <style> head.
function buildHtml(args: {
  alertName: string;
  newMatchesCount: number;
  hotDealsUrl: string;
}): string {
  const { alertName, newMatchesCount, hotDealsUrl } = args;
  // Accord singulier/pluriel — copy validé dans le ticket, ne pas modifier
  // sans validation produit.
  const isPlural = newMatchesCount > 1;
  const opportunityWord = isPlural ? 'nouvelles opportunités' : 'nouvelle opportunité';
  const verbWord = isPlural ? 'viennent' : 'vient';

  return `
<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e4e4e7;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#18181b;border-radius:12px;padding:32px;">
            <tr>
              <td style="font-size:16px;line-height:1.5;color:#e4e4e7;padding-bottom:24px;">
                ${newMatchesCount} ${opportunityWord} matchant les critères de sélection de ton alerte "<strong>${escapeHtml(alertName)}</strong>" ${verbWord} d'arriver !<br><br>
                Ne perds pas une seconde, ces hot deals ne restent pas longtemps !
              </td>
            </tr>
            <tr>
              <td align="center">
                <a href="${hotDealsUrl}" style="display:inline-block;background:#22c55e;color:#0a0a0a;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;">Voir les deals</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();
}

// Échappe les caractères HTML dans le nom d'alerte — le user peut avoir mis
// `<` `>` `&` ou des guillemets dans son nom, on ne veut pas casser le rendu
// ni ouvrir une porte d'injection HTML.
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
