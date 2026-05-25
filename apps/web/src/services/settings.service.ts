import { getUserAccount } from '@/services/account.service';

// Sous-ensemble du compte exposé à la page Settings (WhatsApp uniquement
// pour l'instant). Évite de remonter tous les champs sensibles du compte
// jusqu'au composant client.
export type TAccountSettings = {
  whatsappPhoneNumber: string | null;
  whatsappIsGroup: boolean;
};

/**
 * Récupère uniquement les colonnes WhatsApp du compte courant.
 * On passe par `columnsToKeep` pour minimiser la surface SQL.
 */
export async function getAccountSettings(): Promise<TAccountSettings> {
  const account = await getUserAccount({
    columnsToKeep: { whatsappPhoneNumber: true, whatsappIsGroup: true },
  });
  return {
    whatsappPhoneNumber: account.whatsappPhoneNumber ?? null,
    whatsappIsGroup: account.whatsappIsGroup,
  };
}
