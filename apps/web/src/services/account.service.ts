import { createDrizzleSupabaseClient } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import type { TAccount, TAccountSelectedKeys } from '@alertdeals/db';
import { EAccountErrorCode, EGeneralErrorCode } from '@alertdeals/shared';

/**
 * Récupère l'id du compte courant à partir du JWT Supabase.
 * Throw UNAUTHORIZED si pas de session — les callers (actions/services)
 * remontent ce code via le pattern `toActionError`.
 */
export async function getCurrentAccountId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error(EGeneralErrorCode.UNAUTHORIZED);
  return user.id;
}

/**
 * Charge le compte de l'user courant via RLS (le where est implicite côté DB).
 * Surcharges :
 *  - Sans options → row complet (TAccount)
 *  - Avec `columnsToKeep` → projection partielle typée
 */
export async function getUserAccount(): Promise<TAccount>;
export async function getUserAccount<
  T extends Partial<Record<keyof TAccount, boolean>>,
>(options: { columnsToKeep: T }): Promise<Pick<TAccount, TAccountSelectedKeys<T>>>;
export async function getUserAccount(
  options?: { columnsToKeep?: Partial<Record<keyof TAccount, boolean>> },
): Promise<TAccount | Partial<TAccount>> {
  const client = await createDrizzleSupabaseClient();

  const account = await client.rls(async (tx) =>
    tx.query.accounts.findFirst({
      ...(options?.columnsToKeep && { columns: options.columnsToKeep }),
    }),
  );

  if (!account) throw new Error(EAccountErrorCode.ACCOUNT_NOT_FOUND);
  return account;
}
