/**
 * Data utilities.
 * slugify/buildFullName adapted from the LFUCG contributors reference app
 * (~/lt/contributors/src/data/utils.ts).
 *
 * Note: employer normalization now lives exclusively in the data pipeline
 * (scripts/employer-normalize.mjs) — donors carry a pipeline-computed
 * `employerKey`, and e/<date>/employers.json is the canonical rollup.
 */

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'unknown';

export const buildFullName = (first: string, last: string): string =>
  [first, last].filter(Boolean).join(' ').trim();

export type SortDirection = 'asc' | 'desc';

/** Generic comparator used by sortable tables. */
export const compareValues = (a: string | number, b: string | number, direction: SortDirection): number => {
  let cmp: number;
  if (typeof a === 'number' && typeof b === 'number') {
    cmp = a - b;
  } else {
    cmp = String(a).localeCompare(String(b), 'en', { sensitivity: 'base' });
  }
  return direction === 'asc' ? cmp : -cmp;
};

/** Parse a KREF receipt date string ("M/D/YYYY") into a sortable timestamp. Returns 0 if unparseable. */
export const parseReceiptDate = (value: string): number => {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return 0;
  const [, m, d, y] = match;
  return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
};
