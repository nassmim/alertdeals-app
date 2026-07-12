import { DashboardLayoutSkeleton } from '@/components/layout/dashboard-layout-skeleton';
import { NoAccountScreen } from '@/components/layout/no-account-screen';
import { Sidebar } from '@/components/layout/sidebar';
import { TrialBanner } from '@/components/layout/trial-banner';
import { getCurrentAccountId, getUserAccount } from '@/services/account.service';
import { getTrialStatus } from '@/services/trial.service';
import { EAccountErrorCode } from '@alertdeals/shared';
import { Suspense, type ReactNode } from 'react';

async function DashboardLayoutInner({ children }: { children: ReactNode }) {
  // A Supabase user can be authenticated without an account row. In practice this
  // only happens in dev (Supabase keeps the session cookies while the local DB has
  // no matching row). Redirecting to /login would loop — the session is still valid,
  // so the middleware would bounce back to /dashboard. Instead we render a screen
  // with a sign-out button so the stale session can be cleared.
  let account;
  try {
    account = await getUserAccount();
  } catch (error) {
    if (error instanceof Error && error.message === EAccountErrorCode.ACCOUNT_NOT_FOUND)
      return <NoAccountScreen />;
    throw error;
  }

  // Resolved server-side so the banner ships pre-rendered (no flicker / no client fetch).
  const accountId = await getCurrentAccountId();
  const trialStatus = await getTrialStatus(accountId);

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-slate-950 via-indigo-950 to-slate-900">
      <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-fuchsia-500/15 blur-3xl" />

      <Sidebar isAdmin={Boolean(account.adminRole)} />

      <main className="relative md:pl-64">
        <TrialBanner status={trialStatus} />
        <div className="mx-auto max-w-5xl px-6 py-8 text-slate-100">{children}</div>
      </main>
    </div>
  );
}

const DashboardLayout = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<DashboardLayoutSkeleton>{children}</DashboardLayoutSkeleton>}>
    <DashboardLayoutInner>{children}</DashboardLayoutInner>
  </Suspense>
);

export default DashboardLayout;
