import { WASocket } from '@whiskeysockets/baileys';

// Un groupe détecté quand notre numéro central vient d'être ajouté dedans.
// Volontairement générique (pas de notion de compte AlertDeals) : c'est le
// worker qui reliera `addedBy` à un compte via `accounts.whatsappPhoneNumber`.
export type DetectedGroup = {
  // JID complet du groupe, ex. "120363...@g.us".
  groupId: string;
  // Nom du groupe au moment de la détection (null si la métadonnée échoue).
  groupName: string | null;
  // Numéro (chiffres uniquement) de la personne qui nous a ajoutés. C'est la
  // clé de liaison avec un compte. Null si Baileys ne fournit pas d'auteur.
  addedBy: string | null;
};

export type GroupAddedHandler = (group: DetectedGroup) => void | Promise<void>;

/**
 * Normalise un JID Baileys en numéro à chiffres uniquement.
 *  - "33612345678@s.whatsapp.net" → "33612345678"
 *  - "33612345678:12@s.whatsapp.net" (suffixe device) → "33612345678"
 * Permet de comparer des JIDs entre eux et avec un numéro stocké en settings.
 */
function jidToPhone(jid: string | null | undefined): string | null {
  if (!jid) return null;
  // On retire le domaine (@...) puis l'éventuel suffixe device (:NN), et on ne
  // garde que les chiffres pour une comparaison robuste.
  const beforeDomain = jid.split('@')[0] ?? '';
  const beforeDevice = beforeDomain.split(':')[0] ?? '';
  const digits = beforeDevice.replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

/**
 * Écoute l'ajout de notre numéro central dans un groupe WhatsApp.
 *
 * Baileys émet `group-participants.update` à chaque changement de membres.
 * On ne réagit qu'au cas `action === 'add'` ET quand le numéro ajouté est le
 * nôtre (comparaison via `socket.user.id`). On récupère alors le nom du groupe
 * et on remonte `{ groupId, groupName, addedBy }` au handler fourni.
 *
 * Le handler ne doit pas throw : une erreur de traitement (DB, etc.) ne doit
 * pas casser le socket. On loggue défensivement ici.
 */
export function onWhatsAppGroupAdded(
  socket: WASocket,
  handler: GroupAddedHandler,
): void {
  // TODO(diagnostic temporaire) : confirmer que LE socket de l'écouteur est
  // bien vivant (qu'on écoute sur la bonne instance, pas un socket mort).
  socket.ev.on('connection.update', (u) => {
    if (u.connection) {
      console.log(
        `[whatsapp][diag] (socket écouteur) connection=${u.connection} user=${socket.user?.id}`,
      );
    }
  });

  socket.ev.on('group-participants.update', async (update) => {
    // TODO(diagnostic temporaire) : tracer chaque event de participants.
    console.log('[whatsapp][diag] group-participants.update', {
      id: update.id,
      action: update.action,
      author: update.author,
      authorPn: update.authorPn,
      participants: update.participants.map((p) => p.id),
      ourId: socket.user?.id,
    });

    if (update.action !== 'add') return;

    // Numéro du compte central (celui qui est appairé sur ce socket).
    const ourPhone = jidToPhone(socket.user?.id);
    if (!ourPhone) return;

    // On ne réagit que si c'est BIEN notre numéro qui a été ajouté, pas un
    // autre participant rejoignant le groupe.
    const weWereAdded = update.participants.some(
      (participant) => jidToPhone(participant.id) === ourPhone,
    );
    // TODO(diagnostic temporaire)
    console.log('[whatsapp][diag] ourPhone =', ourPhone, '| weWereAdded =', weWereAdded);
    if (!weWereAdded) return;

    // Le nom du groupe est une métadonnée séparée ; un échec (groupe privé,
    // rate-limit) ne doit pas empêcher d'enregistrer le groupId.
    let groupName: string | null = null;
    try {
      const metadata = await socket.groupMetadata(update.id);
      groupName = metadata.subject ?? null;
    } catch (error) {
      console.warn(
        '[whatsapp] groupMetadata failed:',
        error instanceof Error ? error.message : error,
      );
    }

    try {
      await handler({
        groupId: update.id,
        groupName,
        // `authorPn` (phone number) en priorité : `author` peut être un LID
        // interne Baileys, pas le vrai numéro. C'est `addedBy` qui sert de clé
        // de liaison avec le compte, il doit donc être le numéro réel.
        addedBy: jidToPhone(update.authorPn ?? update.author),
      });
    } catch (error) {
      console.error(
        '[whatsapp] group-added handler error:',
        error instanceof Error ? error.message : error,
      );
    }
  });
}
