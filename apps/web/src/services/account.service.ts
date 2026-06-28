import { createDrizzleSupabaseClient } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import {
  getDBAdminClient,
  type TAccount,
  type TAccountSelectedKeys,
} from '@alertdeals/db';
import { EAccountErrorCode, EGeneralErrorCode } from '@alertdeals/shared';

export async function getCurrentAccountId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error(EGeneralErrorCode.UNAUTHORIZED);
  return user.id;
}

export async function getUserAccount(): Promise<TAccount>;
export async function getUserAccount<
  T extends Partial<Record<keyof TAccount, boolean>>,
>(options: { columnsToKeep: T }): Promise<Pick<TAccount, TAccountSelectedKeys<T>>>;
export async function getUserAccount(
  options?: { columnsToKeep?: Partial<Record<keyof TAccount, boolean>> },
): Promise<TAccount | Partial<TAccount>> {
  const client = await createDrizzleSupabaseClient();

  const account = await client.rls((tx) =>
    tx.query.accounts.findFirst({
      ...(options?.columnsToKeep && { columns: options.columnsToKeep }),
    }),
  );

  if (!account) throw new Error(EAccountErrorCode.ACCOUNT_NOT_FOUND);
  return account;
}

export type TPendingAccount = Pick<TAccount, 'id' | 'email' | 'createdAt'>;

/**
 * Lists accounts still awaiting admin confirmation (self-signups).
 * Reads other users' rows, so it bypasses RLS — caller must be a super-admin.
 */
export async function getPendingAccounts(): Promise<TPendingAccount[]> {
  const db = getDBAdminClient();

  return db.query.accounts.findMany({
    columns: { id: true, email: true, createdAt: true },
    where: (table, { eq }) => eq(table.confirmedByAdmin, false),
    orderBy: (table, { asc }) => asc(table.createdAt),
  });
}
