import { pages } from "@/config/routes";
import { createClient } from "@/lib/supabase/server";
import { handlePostAuth } from "@/services/auth.service";
import { EAuthErrorCode } from "@alertdeals/shared";
import { NextResponse } from "next/server";

/**
 * Maps known raw provider/Supabase error strings to a stable error code.
 * The client maps the code to a user-facing FR message via getErrorMessage().
 */
function mapAuthError(raw: string | null | undefined): EAuthErrorCode {
  if (!raw) return EAuthErrorCode.AUTH_ERROR;
  const lower = raw.toLowerCase();

  if (lower.includes("expired")) return EAuthErrorCode.LINK_EXPIRED;
  if (
    lower.includes("invalid") &&
    (lower.includes("token") || lower.includes("otp"))
  ) {
    return EAuthErrorCode.LINK_INVALID;
  }
  if (lower.includes("access_denied") || lower.includes("user denied")) {
    return EAuthErrorCode.OAUTH_DENIED;
  }

  return EAuthErrorCode.AUTH_ERROR;
}

function redirectToLogin(origin: string, code: EAuthErrorCode) {
  return NextResponse.redirect(
    `${origin}${pages.login}?error=${encodeURIComponent(code)}`,
  );
}

async function handleAuthSuccess(origin: string): Promise<NextResponse> {
  // Shared gate (also used by the implicit/hash flow via completeImplicitAuth):
  // account exists + confirmedByAdmin, signs out on failure.
  const result = await handlePostAuth(pages.hotDeals);

  if (!result.ok) return redirectToLogin(origin, result.error);

  return NextResponse.redirect(`${origin}${result.next}`);
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const providerError = searchParams.get("error");
  const providerErrorDescription = searchParams.get("error_description");

  if (providerError || providerErrorDescription) {
    return redirectToLogin(
      origin,
      mapAuthError(providerErrorDescription || providerError),
    );
  }

  // Magic link / invite flow
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "email" | "invite" | "magiclink" | "recovery",
    });

    if (verifyError)
      return redirectToLogin(origin, mapAuthError(verifyError.message));

    return handleAuthSuccess(origin);
  }

  // OAuth flow (Google)
  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError)
      return redirectToLogin(origin, mapAuthError(exchangeError.message));

    return handleAuthSuccess(origin);
  }

  return redirectToLogin(origin, EAuthErrorCode.AUTH_ERROR);
}
