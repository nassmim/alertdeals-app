import { buildCorsHeaders } from '@/lib/cors';
import { getMainPlans } from '@/services/plan.service';
import { NextResponse } from 'next/server';

const METHODS = 'GET, OPTIONS';

// Thin wrapper around the plan service. Kept as an API route so the subscription
// page (and any future public landing page) can fetch plans without importing
// server-only code into the client bundle.
export async function GET(request: Request) {
  const headers = buildCorsHeaders(request.headers.get('origin'), METHODS);
  const plans = await getMainPlans();
  return NextResponse.json({ plans }, { headers });
}

// CORS preflight: the landing page (cross-origin) triggers an OPTIONS request
// before the GET, which must answer with the allow headers.
export async function OPTIONS(request: Request) {
  const headers = buildCorsHeaders(request.headers.get('origin'), METHODS);
  return new NextResponse(null, { status: 204, headers });
}
