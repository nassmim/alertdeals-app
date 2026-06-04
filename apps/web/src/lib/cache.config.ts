export const CACHE_TAGS = {
  alertsByAccount: (accountId: string) => `alerts:${accountId}`,
  alert: (id: string) => `alert:${id}`,
  brands: 'brands',
  vehicleModels: 'vehicle-models',
  vehicleStates: 'vehicle-states',
  accountSettings: (accountId: string) => `account-settings:${accountId}`,
  ads: 'ads',
  matchedAdsByAccount: (accountId: string) => `matched-ads:${accountId}`,
} as const;
