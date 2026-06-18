import { getUserAccount } from '@/services/account.service';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminInviteForm } from './admin-invite-form';

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Invite de nouveaux utilisateurs à rejoindre AlertDeals',
};

export default async function AdminPage() {
  const account = await getUserAccount({ columnsToKeep: { isAdmin: true } });

  // Hide the page entirely from non-admins
  if (!account?.isAdmin) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Admin</h1>
        <p className="mt-1 text-sm text-slate-400">
          Invite un nouvel utilisateur à rejoindre AlertDeals
        </p>
      </div>

      <AdminInviteForm />
    </div>
  );
}
