import { getMainPlans } from '@/services/plan.service';
import { NextResponse } from 'next/server';

// Thin wrapper around the plan service. Kept as an API route so the subscription
// page (and any future public landing page) can fetch plans without importing
// server-only code into the client bundle.
export async function GET() {
  const plans = await getMainPlans();
  return NextResponse.json({ plans });
}
