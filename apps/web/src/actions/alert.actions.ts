'use server';

import { CACHE_TAGS } from '@/lib/cache.config';
import { createDrizzleSupabaseClient } from '@/lib/db';
import { getCurrentAccountId } from '@/services/account.service';
import { getAccountAlerts } from '@/services/alert.service';
import { hasActiveSubscription } from '@/services/subscription.service';
import { alertFormSchema, createAlertSchema } from '@/validation-schemas';
import { alerts, eq } from '@alertdeals/db';
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

// All enum values across error code namespaces — used to whitelist messages
// caught from service throws before re-emitting them across the action → client boundary.
const KNOWN_ERROR_CODES = new Set<string>([
  ...Object.values(EGeneralErrorCode),
  ...Object.values(EAccountErrorCode),
  ...Object.values(ESubscriptionErrorCode),
  ...Object.values(EAlertErrorCode),
]);

function toActionError(error: unknown): { error: TErrorCode } {
  if (error instanceof Error && KNOWN_ERROR_CODES.has(error.message)) {
    return { error: error.message as TErrorCode };
  }
  return { error: EGeneralErrorCode.UNKNOWN_ERROR };
}

type TCreateAlertResult = { id: string } | { error: TErrorCode };

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
          brandId: validated.brandId ?? null,
          modelId: validated.modelId ?? null,
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

export async function fetchAccountAlerts() {
  return getAccountAlerts();
}

type TUpdateAlertResult = { id: string } | { error: TErrorCode };

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
    const [updated] = await db.rls(async (tx) =>
      tx
        .update(alerts)
        .set({
          name: validated.name ?? null,
          brandId: validated.brandId ?? null,
          modelId: validated.modelId ?? null,
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
        .returning({ id: alerts.id }),
    );

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
