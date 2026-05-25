import { createDrizzleSupabaseClient } from '@/lib/db';
import { accounts, eq } from '@alertdeals/db';

/**
 * Vérifie si l'user a un abonnement actif. Utilisé pour gater l'accès aux
 * features premium (création d'alertes, passage en statut "active", etc.).
 * Le booléen `has_subscription` est positionné manuellement par l'admin
 * pour l'instant — aucune intégration Stripe encore.
 */
export async function hasActiveSubscription(accountId: string): Promise<boolean> {
  const client = await createDrizzleSupabaseClient();

  const account = await client.rls(async (tx) =>
    tx.query.accounts.findFirst({
      where: eq(accounts.id, accountId),
      columns: { hasSubscription: true },
    }),
  );

  return account?.hasSubscription ?? false;
}
