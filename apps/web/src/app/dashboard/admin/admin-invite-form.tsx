'use client';

import { inviteUser } from '@/actions/admin.actions';
import { getErrorMessage } from '@/utils/error-messages.utils';
import {
  inviteUserSchema,
  type TInviteUserFormData,
} from '@/validation-schemas';
import type { TErrorCode } from '@alertdeals/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

/**
 * Admin invite form
 * Sends a Supabase invitation email so the recipient can sign up.
 */
export function AdminInviteForm() {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TInviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = (data: TInviteUserFormData) => {
    startTransition(async () => {
      const result = await inviteUser(data);

      if (result.error) {
        toast.error(getErrorMessage(result.error as TErrorCode));
        return;
      }

      reset();
      toast.success('Invitation envoyée');
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">
          Inviter un utilisateur
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Un email d&apos;invitation sera envoyé à cette adresse
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <input
                type="email"
                placeholder="email@exemple.fr"
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
              {isPending ? 'Envoi…' : 'Inviter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
