// Allowlist of origins permitted to call our public API routes (e.g. the
// landing page / site vitrine fetching plans). Comma-separated env var so the
// allowed origins differ per environment (localhost in dev, alertdeals.fr in prod).
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export function buildCorsHeaders(
  origin: string | null,
  methods: string,
): Record<string, string> {
  const isAllowed = !!origin && allowedOrigins.includes(origin);

  return {
    // Echo back the exact origin when allowed (never `*`), else `null` so the
    // browser blocks the response.
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}
