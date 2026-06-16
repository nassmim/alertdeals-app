// Formatters partagés par les vues d'analyse tarifaire. Pures, sans état :
// volontairement hors composant pour être réutilisées par tous les sous-blocs.

const integerFormatter = new Intl.NumberFormat('fr-FR');

/** Montant en euros, sans décimales : 12450 → "12 450 €". */
export function eur(value: number | null): string {
  if (value == null) return '—';
  return `${integerFormatter.format(Math.round(value))} €`;
}

/** Entier formaté à la française : 1234 → "1 234". */
export function num(value: number | null): string {
  if (value == null) return '—';
  return integerFormatter.format(Math.round(value));
}

/** Kilométrage : 48000 → "48 000 km". */
export function km(value: number | null): string {
  if (value == null) return '—';
  return `${integerFormatter.format(Math.round(value))} km`;
}

/** Pourcentage signé : -15 → "−15 %", 8 → "+8 %". */
export function pct(value: number | null): string {
  if (value == null) return '—';
  const rounded = Math.round(value);
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
  return `${sign}${Math.abs(rounded)} %`;
}
