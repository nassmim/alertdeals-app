"use client";

import { completeImplicitAuth } from "@/actions/auth.actions";
import { pages } from "@/config/routes";
import { createClient } from "@/lib/supabase/client";
import { EAuthErrorCode } from "@alertdeals/shared";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Client-side page that captures the hash fragment from Supabase implicit-flow
 * redirects. Admin `inviteUserByEmail` links return the tokens in the URL
 * fragment (#access_token=...&refresh_token=...), which the server never sees,
 * so we must read it client-side.
 *
 * We persist the session via setSession (the SSR browser client writes the
 * auth cookies), then call completeImplicitAuth so the SAME server-side gate
 * as the callback runs (confirmedByAdmin check).
 */
export default function AuthConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.substring(1);

    if (!hash) {
      console.warn("[auth/confirm] no hash fragment - redirect to login");
      redirectToLogin(EAuthErrorCode.AUTH_ERROR);
      return;
    }

    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const fragmentError = params.get("error");
    const fragmentErrorDescription = params.get("error_description");
    const next = params.get("next") ?? pages.hotDeals;

    if (fragmentError || fragmentErrorDescription) {
      console.warn("[auth/confirm] provider error in fragment", {
        fragmentError,
        fragmentErrorDescription,
      });
      redirectToLogin(
        mapFragmentError(fragmentErrorDescription || fragmentError || ""),
      );
      return;
    }

    if (!accessToken || !refreshToken) {
      console.warn("[auth/confirm] missing tokens in fragment");
      redirectToLogin(EAuthErrorCode.AUTH_ERROR);
      return;
    }

    function redirectToLogin(code: EAuthErrorCode) {
      router.replace(`${pages.login}?error=${encodeURIComponent(code)}`);
    }

    function mapFragmentError(raw: string): EAuthErrorCode {
      const lower = raw.toLowerCase();
      if (lower.includes("expired")) return EAuthErrorCode.LINK_EXPIRED;
      if (lower.includes("invalid")) return EAuthErrorCode.LINK_INVALID;
      return EAuthErrorCode.AUTH_ERROR;
    }

    async function confirm() {
      const supabase = createClient();

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken!,
        refresh_token: refreshToken!,
      });

      if (setSessionError) {
        console.error("[auth/confirm] setSession FAILED", {
          message: setSessionError.message,
        });
        redirectToLogin(EAuthErrorCode.AUTH_ERROR);
        return;
      }

      const result = await completeImplicitAuth(next);

      if (!result.ok) {
        // Gate failed (not confirmed by admin, no account, ...): the server
        // already signed out; surface the FR message on the login page.
        await supabase.auth.signOut();
        redirectToLogin(result.error);
        return;
      }

      // Strip the fragment from history then go to the gated destination.
      router.replace(result.next);
    }

    // Never leave the user stuck on "Connexion en cours...": any thrown error
    // (failed server action, network, ...) falls back to the login page.
    confirm().catch((error) => {
      console.error("[auth/confirm] confirm() threw", error);
      redirectToLogin(EAuthErrorCode.AUTH_ERROR);
    });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-slate-400">Connexion en cours...</p>
    </div>
  );
}
