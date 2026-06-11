import { describe, expect, it } from 'vitest';
import {
  formatElectionLabel,
  formatMoney,
  formatMoneyExact,
  formatMonthLabel,
  formatMonthShort,
  raceDisplayName,
  formatContributionType,
} from './format';

describe('formatMoney', () => {
  it('formats whole dollars with grouping and no cents', () => {
    expect(formatMoney(1234567)).toBe('$1,234,567');
    expect(formatMoney(22831198.82)).toBe('$22,831,199');
  });

  it('formats negatives (refunds)', () => {
    expect(formatMoney(-500)).toBe('-$500');
  });
});

describe('formatMoneyExact', () => {
  it('keeps cents', () => {
    expect(formatMoneyExact(1532867.46)).toBe('$1,532,867.46');
    expect(formatMoneyExact(100)).toBe('$100.00');
  });
});

describe('formatElectionLabel', () => {
  it('formats "May 19, 2026 — Primary"', () => {
    expect(formatElectionLabel('2026-05-19', 'PRIMARY')).toBe('May 19, 2026 — Primary');
  });

  it('does not shift dates across timezones', () => {
    // new Date('2026-11-03') would be Nov 2 in US timezones; local parsing must not.
    expect(formatElectionLabel('2026-11-03', 'GENERAL')).toBe('November 3, 2026 — General');
  });
});

describe('month labels', () => {
  it('formats long and short month labels', () => {
    expect(formatMonthLabel('2026-05')).toBe('May 2026');
    expect(formatMonthShort('2026-01')).toBe('Jan ’26');
  });
});

describe('raceDisplayName', () => {
  it('joins office and location with an em dash', () => {
    expect(raceDisplayName('MAYOR (J2)', 'LEXINGTON-URBAN COUNTY-FAYETTE')).toBe(
      'MAYOR (J2) — LEXINGTON-URBAN COUNTY-FAYETTE',
    );
  });

  it('omits the dash when location is empty', () => {
    expect(raceDisplayName('GOVERNOR', '')).toBe('GOVERNOR');
  });
});

describe('formatContributionType', () => {
  it('maps known KREF codes', () => {
    expect(formatContributionType('KYPAC')).toBe('Kentucky PAC');
    expect(formatContributionType('OTHER_CANDIDATES')).toBe('Other candidate');
  });

  it('title-cases unknown codes', () => {
    expect(formatContributionType('SOME_NEW_THING')).toBe('Some new thing');
  });
});
