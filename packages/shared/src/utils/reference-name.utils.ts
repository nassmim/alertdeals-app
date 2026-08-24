/**
 * Platform-agnostic comparison key for a reference name (brand, vehicle model).
 * Accents stripped, uppercased, everything but A-Z, 0-9 and "+" removed:
 * "Mercedes-Benz" / "MERCEDES BENZ" → "MERCEDESBENZ", "Citroën" → "CITROEN".
 * "+" is kept because it distinguishes real models (Prius vs Prius+).
 *
 * MUST stay in sync with the `normalized_name` generated column in
 * packages/db/src/schema/ad.schema.ts (same rules, computed by Postgres).
 */
export const normalizeReferenceName = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9+]/g, '');
