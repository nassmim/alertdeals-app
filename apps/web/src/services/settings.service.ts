import { getUserAccount } from '@/services/account.service';

export type TAccountSettings = {
  whatsappPhoneNumber: string | null;
  whatsappIsGroup: boolean;
};

export async function getAccountSettings(): Promise<TAccountSettings> {
  const account = await getUserAccount({
    columnsToKeep: { whatsappPhoneNumber: true, whatsappIsGroup: true },
  });
  return {
    whatsappPhoneNumber: account.whatsappPhoneNumber ?? null,
    whatsappIsGroup: account.whatsappIsGroup,
  };
}
