'use client';

import { updateUserEmail } from '@/actions/account.actions';
import { getErrorMessage } from '@/utils/error-messages.utils';
import {
  updateEmailSchema,
  type TUpdateEmailFormData,
} from '@/validation-schemas';
import { type TErrorCode } from '@alertdeals/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

type AccountTabProps = {
  currentEmail: string;
};

/**
 * Account Tab
 * Lets the user view their current email and request an email change.
 */
export function AccountTab({ currentEmail }: AccountTabProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TUpdateEmailFormData>({
    resolver: zodResolver(updateEmailSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = (data: TUpdateEmailFormData) => {
    startTransition(async () => {
      const result = await updateUserEmail(data);

      if ('error' in result) {
        toast.error(getErrorMessage(result.error as TErrorCode));
        return;
      }

      setPendingEmail(data.email.trim().toLowerCase());
      reset();
      toast.success('Email de confirmation envoyé');
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Email</h2>
        <p className="mt-1 text-sm text-slate-400">
          Modifie l&apos;adresse email associée à ton compte
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <div>
          <span className="block text-sm font-medium text-slate-300">
            Email actuel
          </span>
          <p className="mt-1 text-sm text-slate-400">{currentEmail}</p>
        </div>

        {pendingEmail && (
          <div className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-4">
            <p className="text-sm text-indigo-300">
              Un email de confirmation a été envoyé à{' '}
              <span className="font-medium">{pendingEmail}</span>. Clique sur le
              lien pour valider le changement.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <label
            htmlFor="new-email"
            className="block text-sm font-medium text-slate-300"
          >
            Nouvel email
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <input
                id="new-email"
                type="email"
                placeholder="nouvel.email@exemple.fr"
                {...register('email')}
                disabled={isPending}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-50"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-400">
                  {errors.email.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={isPending || isSubmitting}
              className="cursor-pointer rounded-xl bg-linear-to-r from-indigo-500 to-fuchsia-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition-all hover:from-indigo-400 hover:to-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? 'Envoi...' : 'Modifier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
