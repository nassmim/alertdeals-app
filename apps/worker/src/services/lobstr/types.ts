import { getDBAdminClient, TAdInsert, TAdReferenceData } from "@alertdeals/db";

export type TDBClient = ReturnType<typeof getDBAdminClient>;

/**
 * Maps one raw Lobstr result (platform-specific shape) to an `ads` row.
 * Returns null when the result must be skipped (e.g. non-vehicle listing).
 */
export type TAdMapper<TRaw> = (
  db: TDBClient,
  ad: TRaw,
  referenceData: TAdReferenceData,
) => Promise<TAdInsert | null>;
