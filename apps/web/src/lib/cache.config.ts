export const CACHE_TAGS = {
  alertsByAccount: (accountId: string) => `alerts:${accountId}`,
  alert: (id: string) => `alert:${id}`,
  brands: 'brands',
  vehicleModels: 'vehicle-models',
  ads: 'ads',
  matchedAdsByAccount: (accountId: string) => `matched-ads:${accountId}`,
} as const;
