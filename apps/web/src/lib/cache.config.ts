export const CACHE_TAGS = {
  alertsByAccount: (accountId: string) => `alerts:${accountId}`,
  alert: (id: string) => `alert:${id}`,
  brands: 'brands',
  vehicleModels: 'vehicle-models',
  vehicleStates: 'vehicle-states',
  accountSettings: (accountId: string) => `account-settings:${accountId}`,
  ads: 'ads',
  // Permet d'invalider une annonce précise (utilisé par la page détail)
  // sans purger le cache des autres ads. Si jamais le worker met à jour
  // une ad (prix qui baisse, par ex.), on update juste ce tag-là.
  adById: (adId: string) => `ad:${adId}`,
  matchedAdsByAccount: (accountId: string) => `matched-ads:${accountId}`,
} as const;
