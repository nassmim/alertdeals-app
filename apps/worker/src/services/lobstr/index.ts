import { EAdSource, TAdSource } from "@alertdeals/shared";
import { mapAutoScout24Ad, TAdFromAutoScout24 } from "./autoscout24.mapper.js";
import { mapLaCentraleAd, TAdFromLaCentrale } from "./lacentrale.mapper.js";
import { mapLeboncoinAd, TAdFromLeboncoin } from "./leboncoin.mapper.js";
import { mapParuVenduAd, TAdFromParuVendu } from "./paruvendu.mapper.js";
import { TAdMapper } from "./types.js";

export type TRawAdBySource = {
  [EAdSource.LEBONCOIN]: TAdFromLeboncoin;
  [EAdSource.AUTOSCOUT24]: TAdFromAutoScout24;
  [EAdSource.LACENTRALE]: TAdFromLaCentrale;
  [EAdSource.PARUVENDU]: TAdFromParuVendu;
};

export type TRawAd = TRawAdBySource[TAdSource];

/**
 * One mapper per listing platform (= per Lobstr squid)
 */
export const AD_MAPPERS: {
  [K in TAdSource]: TAdMapper<TRawAdBySource[K]>;
} = {
  [EAdSource.LEBONCOIN]: mapLeboncoinAd,
  [EAdSource.AUTOSCOUT24]: mapAutoScout24Ad,
  [EAdSource.LACENTRALE]: mapLaCentraleAd,
  [EAdSource.PARUVENDU]: mapParuVenduAd,
};

/**
 * Returns the mapper for a source, widened so callers can pass the raw
 * (untyped) Lobstr results without knowing the source at compile time.
 */
export const getAdMapper = (source: TAdSource): TAdMapper<TRawAd> =>
  AD_MAPPERS[source] as TAdMapper<TRawAd>;

export * from "./types.js";
