import type { DonorLite } from './types';
import { isSyntheticKey } from './synthetic';

export const EMPTY_QUERY_LIMIT = 100;
export const RESULT_LIMIT = 200;

/**
 * Filter the per-election donor list by a free-text query across
 * name, city, state, employer, and occupation. Every whitespace-separated
 * term must match somewhere (AND semantics).
 *
 * With an empty query, returns the top donors by total (list is pre-sorted
 * by total desc) — synthetic donors (self-funding, unitemized bundles,
 * anonymous/unnamed cash) are excluded unless `includeSynthetic` is true.
 * Non-empty searches always match synthetics so they stay findable.
 */
export function filterDonors(donors: DonorLite[], query: string, includeSynthetic = false): DonorLite[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    const pool = includeSynthetic ? donors : donors.filter((d) => !isSyntheticKey(d.key));
    return pool.slice(0, EMPTY_QUERY_LIMIT);
  }

  const terms = q.split(/\s+/);
  const results: DonorLite[] = [];
  for (const donor of donors) {
    const haystack =
      `${donor.name} ${donor.city} ${donor.state} ${donor.employer} ${donor.occupation}`.toLowerCase();
    if (terms.every((term) => haystack.includes(term))) {
      results.push(donor);
      if (results.length >= RESULT_LIMIT) break;
    }
  }
  return results;
}
