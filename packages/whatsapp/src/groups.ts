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

// Forme partielle d'un participant de groupe telle que renvoyée par Baileys.
// On s'appuie sur `phoneNumber` (JID `@s.whatsapp.net`, le vrai numéro) plutôt
// que sur `id` qui est souvent un `@lid` (identifiant masqué non reliable à un
// compte).
type GroupParticipantLike = {
  id: string;
  phoneNumber?: string | null;
  admin?: string | null;
};

/**
 * Écoute l'ajout de notre numéro central dans un groupe WhatsApp.
 *
 * Quand le bot est ajouté à un groupe, Baileys émet `groups.upsert` avec la
 * métadonnée du groupe (sujet + participants). Chaque participant expose son
 * vrai numéro dans `phoneNumber` (le `id` est un LID masqué). On :
 *   1. vérifie que notre numéro central est bien membre du groupe,
 *   2. déduit `addedBy` = le numéro de l'owner/créateur du groupe (celui qui
 *      nous a ajoutés), résolu depuis la liste des participants,
 *   3. remonte `{ groupId, groupName, addedBy }` au handler fourni.
 *
 * Le handler ne doit pas throw : une erreur de traitement (DB, etc.) ne doit
 * pas casser le socket. On loggue défensivement ici.
 */
export function onWhatsAppGroupAdded(
  socket: WASocket,
  handler: GroupAddedHandler,
): void {
  socket.ev.on('groups.upsert', async (groups) => {
    // Numéro du compte central (celui qui est appairé sur ce socket).
    const ourPhone = jidToPhone(socket.user?.id);
    if (!ourPhone) return;

    for (const group of groups) {
      const participants = (group.participants ?? []) as GroupParticipantLike[];
      // Numéro réel de chaque participant (depuis `phoneNumber`, pas le LID).
      const numbered = participants
        .map((p) => ({ id: p.id, phone: jidToPhone(p.phoneNumber) }))
        .filter((p): p is { id: string; phone: string } => p.phone !== null);

      // On ne réagit que si notre numéro central est bien membre du groupe
      // (`groups.upsert` peut aussi fire lors d'une resync de session).
      const weAreMember = numbered.some((p) => p.phone === ourPhone);
      if (!weAreMember) continue;

      // `addedBy` = l'owner du groupe (le créateur, qui nous a ajoutés).
      // `group.owner` est un LID → on retrouve le participant correspondant
      // pour récupérer son vrai numéro. Fallback : 1er participant non-central.
      const owner = numbered.find((p) => p.id === group.owner);
      const addedBy =
        owner?.phone ??
        numbered.find((p) => p.phone !== ourPhone)?.phone ??
        null;

      try {
        await handler({
          groupId: group.id,
          groupName: group.subject ?? null,
          addedBy,
        });
      } catch (error) {
        console.error(
          '[whatsapp] group-added handler error:',
          error instanceof Error ? error.message : error,
        );
      }
    }
  });
}
