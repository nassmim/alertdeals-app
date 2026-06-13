import { createDrizzleSupabaseClient } from '@/lib/db';

export type TDetectedWhatsappGroup = {
  id: string;
  groupId: string;
  groupName: string | null;
};

/**
 * Liste les groupes WhatsApp détectés pour le compte courant (le bot y a été
 * ajouté). La policy RLS « owner » restreint déjà aux groupes du compte, donc
 * pas de filtre `accountId` explicite ici.
 *
 * Volontairement non caché (`use cache`) : l'écriture vient du worker (client
 * admin, hors RLS) sans `updateTag`, un cache ne serait donc jamais invalidé.
 * La liste est lue à chaud à l'ouverture des réglages.
 */
export async function getDetectedWhatsappGroups(): Promise<TDetectedWhatsappGroup[]> {
  const db = await createDrizzleSupabaseClient();
  return db.rls((tx) =>
    tx.query.whatsappGroups.findMany({
      columns: { id: true, groupId: true, groupName: true },
      orderBy: (group, { desc }) => [desc(group.detectedAt)],
    }),
  );
}
