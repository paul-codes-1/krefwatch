import { describe, expect, it } from 'vitest';
import { filterDonors, EMPTY_QUERY_LIMIT } from './donorSearch';
import type { Donor } from './types';

const donor = (overrides: Partial<Donor>): Donor => ({
  key: 'jane-doe',
  name: 'Jane Doe',
  city: 'Lexington',
  state: 'KY',
  employer: 'University of Kentucky',
  employerKey: 'university of kentucky',
  occupation: 'Professor',
  total: 100,
  count: 1,
  recipients: [],
  ...overrides,
});

const donors: Donor[] = [
  donor({ key: 'jane-doe', name: 'Jane Doe', total: 5000 }),
  donor({
    key: 'candidate-self-bob-mayor',
    name: 'Bob Mayor (self)',
    city: '',
    employer: '',
    employerKey: '',
    occupation: '',
    total: 4000,
  }),
  donor({ key: 'john-smith', name: 'John Smith', city: 'Louisville', employer: 'Humana', employerKey: 'humana', occupation: 'Attorney', total: 900 }),
  donor({ key: 'unitemized-bob-mayor', name: 'Unitemized (Bob Mayor)', city: '', employer: '', employerKey: '', occupation: '', total: 500 }),
  donor({ key: 'ann-jones', name: 'Ann Jones', city: 'Paducah', employer: '', employerKey: '', occupation: 'Farmer', total: 250 }),
];

describe('filterDonors', () => {
  it('excludes synthetic donors from the empty-query default list', () => {
    const defaults = filterDonors(donors, '');
    expect(defaults.map((d) => d.key)).toEqual(['jane-doe', 'john-smith', 'ann-jones']);
    expect(filterDonors(donors, '   ').map((d) => d.key)).toEqual(['jane-doe', 'john-smith', 'ann-jones']);
  });

  it('re-includes synthetics when includeSynthetic is true', () => {
    const withSynthetic = filterDonors(donors, '', true);
    expect(withSynthetic.map((d) => d.key)).toEqual([
      'jane-doe',
      'candidate-self-bob-mayor',
      'john-smith',
      'unitemized-bob-mayor',
      'ann-jones',
    ]);
  });

  it('caps the empty-query list', () => {
    const many = Array.from({ length: EMPTY_QUERY_LIMIT + 50 }, (_, i) => donor({ key: `d-${i}` }));
    expect(filterDonors(many, '')).toHaveLength(EMPTY_QUERY_LIMIT);
  });

  it('matches name case-insensitively', () => {
    expect(filterDonors(donors, 'jane')).toEqual([donors[0]]);
    expect(filterDonors(donors, 'SMITH')).toEqual([donors[2]]);
  });

  it('search results include synthetics when matched, regardless of toggle', () => {
    const hits = filterDonors(donors, 'bob mayor', false);
    expect(hits.map((d) => d.key)).toEqual(['candidate-self-bob-mayor', 'unitemized-bob-mayor']);
  });

  it('matches across city, employer, and occupation', () => {
    expect(filterDonors(donors, 'louisville')).toEqual([donors[2]]);
    expect(filterDonors(donors, 'humana')).toEqual([donors[2]]);
    expect(filterDonors(donors, 'farmer')).toEqual([donors[4]]);
  });

  it('requires every term to match (AND semantics)', () => {
    expect(filterDonors(donors, 'jane lexington')).toEqual([donors[0]]);
    expect(filterDonors(donors, 'jane louisville')).toEqual([]);
  });

  it('returns empty for no matches', () => {
    expect(filterDonors(donors, 'zzzz')).toEqual([]);
  });
});
