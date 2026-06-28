'use client';

import { validateUser } from '@/actions/admin.actions';
import type { TPendingAccount } from '@/services/account.service';
import { getErrorMessage } from '@/utils/error-messages.utils';
import type { TErrorCode } from '@alertdeals/shared';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

/**
 * Pending accounts list (super-admin only)
 * Shows self-signed-up accounts awaiting confirmation, with a per-row
 * "Valider" button that confirms the account and sends it a sign-in link.
 */
export function AdminPendingAccounts({
  accounts,
}: {
  accounts: TPendingAccount[];
}) {
  const [isPending, startTransition] = useTransition();
  const [validatingEmail, setValidatingEmail] = useState<string | null>(null);

  const handleValidate = (email: string) => {
    setValidatingEmail(email);
    startTransition(async () => {
      const result = await validateUser({ email });
      setValidatingEmail(null);

      if (result.error) {
        toast.error(getErrorMessage(result.error as TErrorCode));
        return;
      }

      toast.success('Compte validé');
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Comptes en attente</h2>
        <p className="mt-1 text-sm text-slate-400">
          Valide un compte auto-inscrit pour lui envoyer un lien de connexion
        </p>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400 backdrop-blur-xl">
          Aucun compte en attente de validation
        </div>
      ) : (
        <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
          {accounts.map((account) => {
            const isValidating = isPending && validatingEmail === account.email;

            return (
              <li
                key={account.id}
                className="flex items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{account.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleValidate(account.email)}
                  disabled={isPending}
                  className="shrink-0 cursor-pointer rounded-xl bg-linear-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:from-indigo-400 hover:to-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isValidating ? 'Validation…' : 'Valider'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
