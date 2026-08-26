import {
  ads as adsTable,
  getDBAdminClient,
  getTableColumns,
  sql,
  TAdInsert,
} from "@alertdeals/db";
import { TAdSource } from "@alertdeals/shared";
import { fetchAllReferenceData } from "./ad.service.js";
import { getAdMapper, TRawAd } from "./lobstr/index.js";

const LOBSTR_PLATFORM_FIELD = "lobstrValue" as const;

// Build the `set` payload for upserts: every column except id/createdAt/originalAdId
// is overwritten with the incoming row's value (`excluded.<col>` in Postgres).
const allColumns = getTableColumns(adsTable);
const {
  id: _id,
  createdAt: _createdAt,
  source: _source,
  originalAdId: _origId,
  ...columnsToUpdate
} = allColumns;

const setAdUpdateOnConflict = Object.fromEntries(
  Object.entries(columnsToUpdate).map(([key, column]) => [
    key,
    sql`excluded.${sql.identifier(column.name)}`,
  ]),
);

/**
 * Entry point called by the BullMQ scraping worker after Lobstr posts a webhook.
 */
export const handleLobstrWebhook = async (
  runId: string,
  source: TAdSource,
): Promise<void> => {
  try {
    await saveAdsFromLobstr(runId, source);
  } catch (error) {
    console.error(`[lobstr] failed to ingest run ${runId} (${source})`, error);
    throw error;
  }
};

/**
 * Fetches ads from Lobstr's results API for the given run, maps each ad to our schema,
 * and batch-upserts using `original_ad_id` as the dedup key.
 */
const saveAdsFromLobstr = async (
  runId: string,
  source: TAdSource,
): Promise<void> => {
  const db = getDBAdminClient();

  const ads = await getResultsFromRun(runId);

  // Load all lookup tables once into Maps for O(1) lookup during mapping.
  const referenceData = await fetchAllReferenceData(db, LOBSTR_PLATFORM_FIELD);

  const mapAd = getAdMapper(source);
  const getAdsData = ads.map((ad) => mapAd(db, ad, referenceData));
  const adsToPersistPromise = await Promise.allSettled(getAdsData);

  // This step to ensure we insert only valid objects to the db query
  // Log every drop: a rejected mapper (unexpected payload shape), a null
  // (deliberate skip, e.g. non-vehicle or no price)
  // would otherwise disappear silently.
  const adsToPersist: TAdInsert[] = [];
  adsToPersistPromise.forEach((adPromise) => {
    if (adPromise.status === "rejected") return;
    if (!adPromise.value) return;

    // Everything we ingest today is a car: default to typeId 1 instead of dropping
    if (!adPromise.value.typeId) adPromise.value.typeId = 1;

    adsToPersist.push(adPromise.value);
  });

  console.log(
    `[lobstr] run ${runId} (${source}): ${adsToPersist.length}/${ads.length} ad(s) to persist`,
  );
  if (adsToPersist.length === 0) {
    return;
  }

  // Batch the upsert: a single INSERT with thousands of rows would exceed
  // Postgres' 65534-parameter limit (~40 columns × rows) and blow up.
  const BATCH_SIZE = 500;
  for (let i = 0; i < adsToPersist.length; i += BATCH_SIZE) {
    const batch = adsToPersist.slice(i, i + BATCH_SIZE);
    await db
      .insert(adsTable)
      .values(batch)
      // Ad ids are only unique within a platform, hence the composite target
      .onConflictDoUpdate({
        target: [adsTable.source, adsTable.originalAdId],
        set: setAdUpdateOnConflict,
      });
    console.log(
      `[lobstr] run ${runId}: upserted ${Math.min(i + BATCH_SIZE, adsToPersist.length)}/${adsToPersist.length} ads`,
    );
  }
};

const LOBSTR_RESULTS_URL = "https://api.lobstr.io/v1/results";
const LOBSTR_RESULTS_PAGE_SIZE = 1000;

type TLobstrResultsPage = {
  data?: TRawAd[];
  total_results?: number;
  total_pages?: number;
  page?: number;
};

// Gets all the results of a lobstr run using their API (paginated)
// https://docs.lobstr.io/docs/get-results
const getResultsFromRun = async (runId: string): Promise<TRawAd[]> => {
  const results: TRawAd[] = [];
  let page = 1;

  while (true) {
    const response = await fetch(
      `${LOBSTR_RESULTS_URL}?run=${runId}&page=${page}&page_size=${LOBSTR_RESULTS_PAGE_SIZE}`,
      {
        method: "GET",
        headers: {
          Authorization: `Token ${process.env.LOBSTR_API_KEY}`,
          "Content-Type": "application/json;charset=UTF-8",
        },
        // Hard cap: without it a slow-streaming response never times out and the
        // BullMQ job stays "active" forever (undici resets its timer on each chunk).
        signal: AbortSignal.timeout(120_000),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Lobstr results API returned ${response.status} for run ${runId}, page ${page}: ${body}`,
      );
    }

    const body = (await response.json()) as TLobstrResultsPage;
    const pageData = body.data ?? [];
    results.push(...pageData);

    const hasMore =
      body.total_pages !== undefined
        ? page < body.total_pages
        : pageData.length === LOBSTR_RESULTS_PAGE_SIZE;
    if (!hasMore || pageData.length === 0) break;
    page += 1;
  }

  return results;
};

/**
 * Human-readable identifier of a raw Lobstr result for logs, whatever the
 * platform shape (url / listing_url, annonce_id / listing_id / reference)
 */
const getRawAdLabel = (ad: TRawAd | undefined): string => {
  if (!ad) return "(unknown ad)";
  const raw = ad as Record<string, unknown>;
  const id = raw.annonce_id ?? raw.listing_id ?? raw.reference ?? "?";
  const url = raw.url ?? raw.listing_url ?? "";
  return `${id} ${url}`.trim();
};
