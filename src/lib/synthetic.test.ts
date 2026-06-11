import { describe, expect, it } from 'vitest';
import { isSyntheticKey, syntheticLabel } from './synthetic';

describe('synthetic keys', () => {
  it('labels each synthetic prefix', () => {
    expect(syntheticLabel('unitemized-craig-greenberg')).toBe('Small-dollar bundle');
    expect(syntheticLabel('candidate-self-derek-myers')).toBe('Self-funding');
    expect(syntheticLabel('anonymous-15099')).toBe('Anonymous');
    expect(syntheticLabel('cash-unnamed-12')).toBe('Cash, unnamed');
    expect(syntheticLabel('unnamed-3')).toBe('Unnamed');
  });

  it('returns null for real donor keys', () => {
    expect(syntheticLabel('david-osborne')).toBeNull();
    expect(isSyntheticKey('david-osborne')).toBe(false);
    expect(isSyntheticKey('unitemized-x')).toBe(true);
  });
});
