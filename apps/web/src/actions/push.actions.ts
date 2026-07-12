'use server';

import { createDrizzleSupabaseClient } from '@/lib/db';
import { getCurrentAccountId } from '@/services/account.service';
import { pushSubscriptionSchema } from '@/validation-schemas';
import { and, eq, pushSubscriptions } from '@alertdeals/db';
import {
  EGeneralErrorCode,
  EPushErrorCode,
  type TErrorCode,
} from '@alertdeals/shared';

type ActionResult = { success: true } | { error: TErrorCode };

/**
 * Enregistre (ou met à jour) l'abonnement Web Push de l'appareil courant pour
 * le compte connecté. Upsert sur `(accountId, endpoint)` : si l'appareil se
 * ré-abonne avec de nouvelles clés, on remplace au lieu de dupliquer.
 */
export async function subscribeToPush(data: unknown): Promise<ActionResult> {
  try {
    const accountId = await getCurrentAccountId();

    const parsed = pushSubscriptionSchema.safeParse(data);
    if (!parsed.success) {
      return { error: EGeneralErrorCode.VALIDATION_FAILED };
    }
    const { endpoint, keys } = parsed.data;

    const db = await createDrizzleSupabaseClient();
    await db.rls((tx) =>
      tx
        .insert(pushSubscriptions)
        .values({ accountId, endpoint, p256dh: keys.p256dh, auth: keys.auth })
        .onConflictDoUpdate({
          target: [pushSubscriptions.accountId, pushSubscriptions.endpoint],
          set: { p256dh: keys.p256dh, auth: keys.auth },
        }),
    );

    return { success: true };
  } catch (err) {
    const code = err instanceof Error ? err.message : '';
    if (code === EGeneralErrorCode.UNAUTHORIZED) {
      return { error: EGeneralErrorCode.UNAUTHORIZED };
    }
    return { error: EPushErrorCode.SUBSCRIBE_FAILED };
  }
}

/**
 * Supprime l'abonnement Push de l'appareil courant (l'utilisateur coupe les
 * notifs). Le filtre `accountId` est redondant avec la RLS mais explicite.
 */
export async function unsubscribeFromPush(endpoint: unknown): Promise<ActionResult> {
  try {
    const accountId = await getCurrentAccountId();

    if (typeof endpoint !== 'string' || endpoint.length === 0) {
      return { error: EGeneralErrorCode.VALIDATION_FAILED };
    }

    const db = await createDrizzleSupabaseClient();
    await db.rls((tx) =>
      tx
        .delete(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.accountId, accountId),
            eq(pushSubscriptions.endpoint, endpoint),
          ),
        ),
    );

    return { success: true };
  } catch (err) {
    const code = err instanceof Error ? err.message : '';
    if (code === EGeneralErrorCode.UNAUTHORIZED) {
      return { error: EGeneralErrorCode.UNAUTHORIZED };
    }
    return { error: EPushErrorCode.UNSUBSCRIBE_FAILED };
  }
}
