"use client";

import { signOut } from "@/actions/auth.actions";
import { LogOut, UserX } from "lucide-react";
import { useTransition } from "react";

/**
 * Shown when a Supabase session exists but no matching account row is found.
 * In practice this only happens in dev (session cookies outlive the local DB).
 * Redirecting to /login would loop since the session is still valid, so we
 * offer a sign-out button to clear the stale session instead.
 */
export function NoAccountScreen() {
  const [isSigningOut, startSignOut] = useTransition();

  const handleSignOut = () => {
    startSignOut(() => {
      signOut();
    });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-slate-950 via-indigo-950 to-slate-900 px-6">
      <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-fuchsia-500/15 blur-3xl" />

      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
        <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30">
          <UserX className="h-6 w-6" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-white">
          Aucun compte associé
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Votre session est active mais aucun compte n'est associé à cet
          utilisateur. Déconnectez-vous puis reconnectez-vous.
        </p>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-br from-indigo-500 to-fuchsia-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition-all hover:opacity-90 disabled:opacity-50"
        >
          <LogOut size={18} />
          {isSigningOut ? "Déconnexion…" : "Déconnexion"}
        </button>
      </div>
    </div>
  );
}
