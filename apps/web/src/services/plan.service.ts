import { asc, getDBAdminClient, plans, type TPlan } from "@alertdeals/db";

export type { TPlan };

/**
 * Returns active subscription plans, sorted for display.
 *
 * Plans live in DB (not live-fetched from Stripe) so we own display metadata
 * (name, description, sortOrder) and adding a plan is just a seed row.
 * RLS allows any authenticated user to read this table.
 */
export async function getMainPlans(): Promise<TPlan[]> {
  const db = getDBAdminClient();

  return db.query.plans.findMany({
    where: (table, { eq }) => eq(table.isActive, true),
    orderBy: asc(plans.sortOrder),
  });
}
