/**
 * Worker Configuration
 * Single source of truth for ingestion-related constants.
 */

import { EAdSource, TAdSource } from '@alertdeals/shared';

/**
 * Error Classification for Retry Logic
 *
 * RETRYABLE: network/server errors that often resolve themselves.
 * NON_RETRYABLE: client/auth/validation errors — retrying won't help.
 */
export const RETRYABLE_HTTP_CODES = [408, 429, 500, 502, 503, 504] as const;
export const NON_RETRYABLE_HTTP_CODES = [400, 401, 403, 404, 422] as const;

export function isRetryableHttpCode(code: number): boolean {
  return RETRYABLE_HTTP_CODES.includes(code as (typeof RETRYABLE_HTTP_CODES)[number]);
}

/**
 * BullMQ retry config for the scraping queue.
 * 2 attempts with a fixed 5s delay — Lobstr API blips are usually transient.
 */
export const RETRY_CONFIG = {
  SCRAPING: {
    attempts: 2,
    backoff: {
      type: 'fixed' as const,
      delay: 5000,
    },
  },
} as const;

/**
 * Lobstr squids: one squid (scraper) per listing platform.
 * The webhook gives us `squid.id`, which tells us where the ads come from.
 */
export const LOBSTR_SQUIDS: Record<TAdSource, () => string | undefined> = {
  [EAdSource.LEBONCOIN]: () => process.env.LOBSTR_SQUID_LEBONCOIN,
  [EAdSource.AUTOSCOUT24]: () => process.env.LOBSTR_SQUID_AUTOSCOUT24,
  [EAdSource.LACENTRALE]: () => process.env.LOBSTR_SQUID_LACENTRALE,
  [EAdSource.PARUVENDU]: () => process.env.LOBSTR_SQUID_PARUVENDU,
};

export const getSourceFromSquidId = (
  squidId: string | undefined,
): TAdSource | null => {
  if (!squidId) return null;
  const match = (
    Object.entries(LOBSTR_SQUIDS) as [TAdSource, () => string | undefined][]
  ).find(([, getSquidId]) => getSquidId() === squidId);
  return match ? match[0] : null;
};
