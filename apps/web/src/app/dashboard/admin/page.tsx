import { getPendingAccounts, getUserAccount } from '@/services/account.service';
import { EAdminRole } from '@alertdeals/shared';
import { Loader2 } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { AdminInviteForm } from './admin-invite-form';
import { AdminPendingAccounts } from './admin-pending-accounts';

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Invite de nouveaux utilisateurs à rejoindre AlertDeals',
};

// Le contrôle d'accès lit le compte (donc les cookies → donnée dynamique).
// On l'isole dans un composant async sous <Suspense> pour ne pas bloquer le
// rendu de toute la route hors boundary (exigence Next "uncached data").
async function AdminPageContent() {
  const account = await getUserAccount({ columnsToKeep: { adminRole: true } });

  // Hide the page entirely from non-admins
  if (!account?.adminRole) notFound();

  const isSuperAdmin = account.adminRole === EAdminRole.SUPER_ADMIN;
  const pendingAccounts = isSuperAdmin ? await getPendingAccounts() : [];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Admin</h1>
        <p className="mt-1 text-sm text-slate-400">
          Invite un nouvel utilisateur à rejoindre AlertDeals
        </p>
      </div>

      <AdminInviteForm />

      {isSuperAdmin && <AdminPendingAccounts accounts={pendingAccounts} />}
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-400">
          <Loader2 className="size-5 animate-spin" />
          Chargement…
        </div>
      }
    >
      <AdminPageContent />
    </Suspense>
  );
}
