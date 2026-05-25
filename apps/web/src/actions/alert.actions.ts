'use server';

import { CACHE_TAGS } from '@/lib/cache.config';
import { createDrizzleSupabaseClient } from '@/lib/db';
import { getCurrentAccountId } from '@/services/account.service';
import { getAccountAlerts } from '@/services/alert.service';
import { hasActiveSubscription } from '@/services/subscription.service';
import { alertFormSchema, createAlertSchema } from '@/validation-schemas';
import { alertBrands, alertModels, alerts, eq } from '@alertdeals/db';
import {
  EAccountErrorCode,
  EAlertErrorCode,
  EAlertStatus,
  EGeneralErrorCode,
  ESubscriptionErrorCode,
  type TAlertStatus,
  type TErrorCode,
} from '@alertdeals/shared';
import { updateTag } from 'next/cache';

// Set des codes d'erreur connus de l'app — utilisé comme whitelist pour
// décider si un Error.message remonté par un service est un code valide
// qu'on peut renvoyer au client tel quel. Le reste = UNKNOWN_ERROR (sécurité
// pour ne jamais leak un raw stack-trace côté UI).
const KNOWN_ERROR_CODES = new Set<string>([
  ...Object.values(EGeneralErrorCode),
  ...Object.values(EAccountErrorCode),
  ...Object.values(ESubscriptionErrorCode),
  ...Object.values(EAlertErrorCode),
]);

/**
 * Convertit une exception (souvent lancée par un service via `throw new Error(CODE)`)
 * en réponse d'action `{ error }` mappable côté client par `getErrorMessage`.
 * Les codes inconnus retombent sur UNKNOWN_ERROR.
 */
function toActionError(error: unknown): { error: TErrorCode } {
  if (error instanceof Error && KNOWN_ERROR_CODES.has(error.message)) {
    return { error: error.message as TErrorCode };
  }
  return { error: EGeneralErrorCode.UNKNOWN_ERROR };
}

type TCreateAlertResult = { id: string } | { error: TErrorCode };

/**
 * Crée une alerte (et ses associations brands/models via les join tables).
 * Étapes : auth → validation Zod → check abonnement → insert dans une transaction.
 * Le throw côté caller `getCurrentAccountId` est rattrapé par `toActionError`.
 */
export async function createAlert(data: unknown): Promise<TCreateAlertResult> {
  try {
    const accountId = await getCurrentAccountId();

    const parseResult = createAlertSchema.safeParse(data);
    if (!parseResult.success) {
      return { error: EGeneralErrorCode.VALIDATION_FAILED };
    }
    const validated = parseResult.data;

    const isSubscribed = await hasActiveSubscription(accountId);
    if (!isSubscribed) {
      return { error: ESubscriptionErrorCode.SUBSCRIPTION_REQUIRED };
    }

    const db = await createDrizzleSupabaseClient();

    const created = await db.rls(async (tx) => {
      const [row] = await tx
        .insert(alerts)
        .values({
          accountId,
          name: validated.name ?? null,
          locationId: validated.locationId ?? null,
          radiusInKm: validated.radiusInKm ?? null,
          modelYearMin: validated.modelYearMin ?? null,
          modelYearMax: validated.modelYearMax ?? null,
          mileageMin: validated.mileageMin ?? null,
          mileageMax: validated.mileageMax ?? null,
          priceMin: validated.priceMin ?? null,
          mode: validated.mode,
          priceMax: validated.priceMax ?? null,
          marginMinPercentage: validated.marginMinPercentage ?? null,
          notificationChannels: validated.notificationChannels,
        })
        .returning({ id: alerts.id });

      if (!row) return null;

      // Multi-select : on stocke les marques/modèles cibles dans les join tables
      // `alert_brands` / `alert_models` (plutôt qu'une seule FK sur alerts).
      if (validated.brandIds.length > 0) {
        await tx
          .insert(alertBrands)
          .values(validated.brandIds.map((brandId) => ({ alertId: row.id, brandId })));
      }
      if (validated.modelIds.length > 0) {
        await tx
          .insert(alertModels)
          .values(validated.modelIds.map((modelId) => ({ alertId: row.id, modelId })));
      }

      return row;
    });

    if (!created) {
      return { error: EAlertErrorCode.ALERT_SAVE_FAILED };
    }

    updateTag(CACHE_TAGS.alertsByAccount(accountId));

    return { id: created.id };
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Wrapper "use server" exposé aux client components qui ont besoin de
 * recharger la liste après une mutation optimiste.
 */
export async function fetchAccountAlerts() {
  return getAccountAlerts();
}

type TUpdateAlertResult = { id: string } | { error: TErrorCode };

/**
 * Update full d'une alerte. Pour la sync des marques/modèles, on suit un
 * pattern "delete-all + reinsert" (voir commentaire interne).
 */
export async function updateAlert(
  alertId: string,
  data: unknown,
): Promise<TUpdateAlertResult> {
  try {
    const accountId = await getCurrentAccountId();

    const parseResult = alertFormSchema.safeParse(data);
    if (!parseResult.success) {
      return { error: EGeneralErrorCode.VALIDATION_FAILED };
    }
    const validated = parseResult.data;

    const db = await createDrizzleSupabaseClient();

    // RLS enforces account ownership via the `using/withCheck: accountId = auth.uid()` policy.
    const updated = await db.rls(async (tx) => {
      const [row] = await tx
        .update(alerts)
        .set({
          name: validated.name ?? null,
          locationId: validated.locationId ?? null,
          radiusInKm: validated.radiusInKm ?? null,
          modelYearMin: validated.modelYearMin ?? null,
          modelYearMax: validated.modelYearMax ?? null,
          mileageMin: validated.mileageMin ?? null,
          mileageMax: validated.mileageMax ?? null,
          priceMin: validated.priceMin ?? null,
          mode: validated.mode,
          priceMax: validated.priceMax ?? null,
          marginMinPercentage: validated.marginMinPercentage ?? null,
          notificationChannels: validated.notificationChannels,
        })
        .where(eq(alerts.id, alertId))
        .returning({ id: alerts.id });

      if (!row) return null;

      // Sync simple : on vide les join tables puis on réinsère.
      // Volume négligeable (qq marques/modèles par alerte), perf non critique.
      await tx.delete(alertBrands).where(eq(alertBrands.alertId, alertId));
      await tx.delete(alertModels).where(eq(alertModels.alertId, alertId));

      if (validated.brandIds.length > 0) {
        await tx
          .insert(alertBrands)
          .values(validated.brandIds.map((brandId) => ({ alertId, brandId })));
      }
      if (validated.modelIds.length > 0) {
        await tx
          .insert(alertModels)
          .values(validated.modelIds.map((modelId) => ({ alertId, modelId })));
      }

      return row;
    });

    if (!updated) {
      return { error: EAlertErrorCode.ALERT_NOT_FOUND };
    }

    updateTag(CACHE_TAGS.alertsByAccount(accountId));
    updateTag(CACHE_TAGS.alert(alertId));

    return { id: updated.id };
  } catch (error) {
    return toActionError(error);
  }
}

type TUpdateAlertStatusResult =
  | { id: string; status: TAlertStatus }
  | { error: TErrorCode };

/**
 * Toggle ACTIVE / PAUSED depuis le toggle de la liste.
 * Passer en ACTIVE requiert un abonnement → on bloque tôt avant l'update.
 */
export async function updateAlertStatus(
  alertId: string,
  status: TAlertStatus,
): Promise<TUpdateAlertStatusResult> {
  try {
    const accountId = await getCurrentAccountId();

    if (status === EAlertStatus.ACTIVE) {
      const isSubscribed = await hasActiveSubscription(accountId);
      if (!isSubscribed) {
        return { error: ESubscriptionErrorCode.SUBSCRIPTION_REQUIRED };
      }
    }

    const db = await createDrizzleSupabaseClient();

    const updated = await db.rls(async (tx) => {
      const [row] = await tx
        .update(alerts)
        .set({ status })
        .where(eq(alerts.id, alertId))
        .returning({ id: alerts.id, status: alerts.status });
      return row;
    });

    if (!updated) {
      return { error: EAlertErrorCode.ALERT_NOT_FOUND };
    }

    updateTag(CACHE_TAGS.alertsByAccount(accountId));
    updateTag(CACHE_TAGS.alert(alertId));
    return updated;
  } catch (error) {
    return toActionError(error);
  }
}

type TDeleteAlertResult = { success: true } | { error: TErrorCode };

/**
 * Suppression hard. Les join tables (alertBrands/alertModels) et les
 * matched_ads cascadent automatiquement (ON DELETE CASCADE en DB).
 */
export async function deleteAlert(alertId: string): Promise<TDeleteAlertResult> {
  try {
    const accountId = await getCurrentAccountId();
    const db = await createDrizzleSupabaseClient();

    const deleted = await db.rls(async (tx) =>
      tx.delete(alerts).where(eq(alerts.id, alertId)).returning({ id: alerts.id }),
    );

    if (deleted.length === 0) {
      return { error: EAlertErrorCode.ALERT_NOT_FOUND };
    }

    updateTag(CACHE_TAGS.alertsByAccount(accountId));
    updateTag(CACHE_TAGS.alert(alertId));
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}
