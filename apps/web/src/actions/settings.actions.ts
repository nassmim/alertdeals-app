'use server';

import { CACHE_TAGS } from '@/lib/cache.config';
import { createDrizzleSupabaseClient } from '@/lib/db';
import { getCurrentAccountId } from '@/services/account.service';
import { whatsappSettingsSchema } from '@/validation-schemas';
import { accounts, eq } from '@alertdeals/db';
import {
  EGeneralErrorCode,
  ESettingsErrorCode,
  type TErrorCode,
} from '@alertdeals/shared';
import { updateTag } from 'next/cache';

type ActionResult = { success: true } | { error: TErrorCode };

export async function updateWhatsappSettings(data: unknown): Promise<ActionResult> {
  try {
    const accountId = await getCurrentAccountId();

    const parseResult = whatsappSettingsSchema.safeParse(data);
    if (!parseResult.success) {
      return { error: EGeneralErrorCode.VALIDATION_FAILED };
    }
    const validated = parseResult.data;

    const db = await createDrizzleSupabaseClient();

    const [updated] = await db.rls((tx) =>
      tx
        .update(accounts)
        .set({
          whatsappPhoneNumber: validated.whatsappPhoneNumber,
          whatsappIsGroup: validated.whatsappIsGroup,
        })
        .where(eq(accounts.id, accountId))
        .returning({ id: accounts.id }),
    );

    if (!updated) {
      return { error: ESettingsErrorCode.SETTINGS_SAVE_FAILED };
    }

    updateTag(CACHE_TAGS.accountSettings(accountId));
    return { success: true };
  } catch (err) {
    const code = err instanceof Error ? err.message : '';
    if (code === EGeneralErrorCode.UNAUTHORIZED) {
      return { error: EGeneralErrorCode.UNAUTHORIZED };
    }
    return { error: EGeneralErrorCode.UNKNOWN_ERROR };
  }
}
