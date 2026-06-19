'use server';

import { pages } from '@/config/routes';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserAccount } from '@/services/account.service';
import { getSiteUrl } from '@/utils/get-site-url';
import { inviteUserSchema } from '@/validation-schemas';
import { EAuthErrorCode, EGeneralErrorCode } from '@alertdeals/shared';

/**
 * Invite a new user by email (admin only).
 *
 * Restricts sign-up to people we explicitly invite: Supabase sends an
 * invitation email, and only its recipient gets a working sign-up link.
 */
export async function inviteUser(formData: { email: string }) {
  // Caller must be a logged-in admin
  const account = await getUserAccount({ columnsToKeep: { isAdmin: true } });

  if (!account?.isAdmin) {
    console.warn('[inviteUser] FORBIDDEN - caller is not admin', {
      hasAccount: !!account,
      isAdmin: account?.isAdmin,
    });
    return { error: EGeneralErrorCode.FORBIDDEN };
  }

  // Validate input
  const result = inviteUserSchema.safeParse(formData);
  if (!result.success) {
    console.warn('[inviteUser] VALIDATION_FAILED', {
      issues: result.error.issues,
    });
    return { error: EGeneralErrorCode.VALIDATION_FAILED };
  }

  const { email } = result.data;

  // Admin invite links return the session in the URL fragment (implicit flow),
  // which the server can't read — so we point at the client confirm page.
  const redirectTo = `${getSiteUrl()}${pages.authConfirm}`;

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminClient();
  } catch (creationError) {
    console.error('[inviteUser] createAdminClient threw', creationError);
    return { error: EAuthErrorCode.AUTH_ERROR };
  }

  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  });

  if (error) {
    console.error('[inviteUser] inviteUserByEmail FAILED', {
      message: error.message,
      status: (error as { status?: number }).status,
      code: (error as { code?: string }).code,
      name: error.name,
      fullError: error,
    });

    // Supabase returns email_exists / "already been registered" when the
    // address already has an account: surface a dedicated message.
    const code = (error as { code?: string }).code;
    const message = error.message?.toLowerCase() ?? '';
    if (
      code === 'email_exists' ||
      message.includes('already been registered') ||
      message.includes('already exists')
    ) {
      return { error: EAuthErrorCode.USER_ALREADY_EXISTS };
    }

    return { error: EAuthErrorCode.AUTH_ERROR };
  }

  // The DB trigger creates the account row with confirmed_by_admin = true by
  // default, so the invited user can complete sign-in right away — no extra
  // UPDATE needed here (which would race with the trigger).
  return { success: true };
}
