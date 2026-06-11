/**
 * Synthetic donor identity keys produced by the data pipeline for
 * contributions that have no real named donor. They must not be rendered
 * as people, and never link to a donor detail page.
 */

const SYNTHETIC_PREFIXES: ReadonlyArray<readonly [prefix: string, label: string]> = [
  ['unitemized-', 'Small-dollar bundle'],
  ['candidate-self-', 'Self-funding'],
  ['anonymous-', 'Anonymous'],
  ['cash-unnamed-', 'Cash, unnamed'],
  ['unnamed-', 'Unnamed'],
];

/** Human label for a synthetic identity key, or null if the key is a real named donor. */
export const syntheticLabel = (key: string): string | null => {
  for (const [prefix, label] of SYNTHETIC_PREFIXES) {
    if (key.startsWith(prefix)) return label;
  }
  return null;
};

export const isSyntheticKey = (key: string): boolean => syntheticLabel(key) !== null;
