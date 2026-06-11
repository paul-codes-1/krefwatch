import { describe, expect, it } from 'vitest';
import { compareValues, parseReceiptDate, slugify, buildFullName } from './utils';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Craig Greenberg')).toBe('craig-greenberg');
  });

  it('collapses punctuation runs and trims edge hyphens', () => {
    expect(slugify("Mike O'Connell")).toBe('mike-o-connell');
    expect(slugify('  MAYOR (J2) LOUISVILLE-GREATER-JEFFERSON ')).toBe(
      'mayor-j2-louisville-greater-jefferson',
    );
  });

  it('matches pipeline employer keys with apostrophes', () => {
    expect(slugify("jefferson county attorney's office")).toBe('jefferson-county-attorney-s-office');
  });

  it('falls back to "unknown" for empty input', () => {
    expect(slugify('')).toBe('unknown');
    expect(slugify('!!!')).toBe('unknown');
  });
});

describe('buildFullName', () => {
  it('joins first and last, skipping blanks', () => {
    expect(buildFullName('Craig', 'Greenberg')).toBe('Craig Greenberg');
    expect(buildFullName('', 'Greenberg')).toBe('Greenberg');
    expect(buildFullName('Craig', '')).toBe('Craig');
  });
});

describe('compareValues', () => {
  it('compares numbers respecting direction', () => {
    expect(compareValues(1, 2, 'asc')).toBeLessThan(0);
    expect(compareValues(1, 2, 'desc')).toBeGreaterThan(0);
  });

  it('compares strings case-insensitively', () => {
    expect(compareValues('alpha', 'Beta', 'asc')).toBeLessThan(0);
  });
});

describe('parseReceiptDate', () => {
  it('parses M/D/YYYY into a timestamp', () => {
    expect(parseReceiptDate('3/16/2026')).toBe(new Date(2026, 2, 16).getTime());
  });

  it('orders dates correctly', () => {
    expect(parseReceiptDate('12/31/2025')).toBeLessThan(parseReceiptDate('1/1/2026'));
  });

  it('returns 0 for junk', () => {
    expect(parseReceiptDate('')).toBe(0);
    expect(parseReceiptDate('2026-03-16')).toBe(0);
  });
});
