'use server';

import { apiRoutes } from '@/config/routes';
import { createClient } from '@/lib/supabase/server';
import { getSiteUrl } from '@/utils/get-site-url';
import { updateEmailSchema } from '@/validation-schemas';
import { EAuthErrorCode } from '@alertdeals/shared';

/**
 * Triggers an email change for the current user.
 *
 * Supabase sends a confirmation link to the new address (and, when
 * `double_confirm_changes` is enabled in config.toml, to the current one too).
 * The email is only updated once the link is clicked — this returns
 * immediately after the email is sent.
 * The confirmation link comes back as a `token_hash` / `type=email_change`
 * redirect handled by the auth callback route (verifyOtp).
 */
export async function updateUserEmail(formData: {
  email: string;
}): Promise<{ success: true } | { error: EAuthErrorCode }> {
  const result = updateEmailSchema.safeParse(formData);
  if (!result.success) {
    return { error: EAuthErrorCode.EMAIL_INVALID };
  }

  const newEmail = result.data.email.trim().toLowerCase();

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: EAuthErrorCode.AUTH_ERROR };
  }

  if (user.email?.toLowerCase() === newEmail) {
    return { error: EAuthErrorCode.EMAIL_UNCHANGED };
  }

  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    {
      emailRedirectTo: `${getSiteUrl()}${apiRoutes.authCallback}`,
    },
  );

  if (error) {
    const code = (error as { code?: string }).code;
    if (code === 'email_exists' || error.message.includes('already')) {
      return { error: EAuthErrorCode.USER_ALREADY_EXISTS };
    }
    return { error: EAuthErrorCode.EMAIL_UPDATE_FAILED };
  }

  return { success: true };
}
