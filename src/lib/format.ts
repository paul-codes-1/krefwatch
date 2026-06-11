import type { ElectionType } from './types';

const money0 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const money2 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integer = new Intl.NumberFormat('en-US');

/** "$1,234,567" — whole dollars, used in tables and most rollups. */
export const formatMoney = (value: number): string => money0.format(value);

/** "$1,234,567.89" — exact, used on detail-page KPIs. */
export const formatMoneyExact = (value: number): string => money2.format(value);

/** "39,920" */
export const formatCount = (value: number): string => integer.format(value);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** Parse "YYYY-MM-DD" as a local date (avoids the UTC off-by-one of `new Date(string)`). */
export const parseIsoDate = (date: string): Date => {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** "May 19, 2026" */
export const formatLongDate = (isoDate: string): string => {
  const d = parseIsoDate(isoDate);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

const ELECTION_TYPE_LABEL: Record<ElectionType, string> = {
  PRIMARY: 'Primary',
  GENERAL: 'General',
  SPECIAL: 'Special',
};

export const formatElectionType = (type: ElectionType | string): string =>
  ELECTION_TYPE_LABEL[type as ElectionType] ?? type;

/** "May 19, 2026 — Primary" */
export const formatElectionLabel = (isoDate: string, type: ElectionType | string): string =>
  `${formatLongDate(isoDate)} — ${formatElectionType(type)}`;

/** "May 2026" from a full ISO date "2026-05-19" — used in page titles. */
export const formatMonthYear = (isoDate: string): string => {
  const d = parseIsoDate(isoDate);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
};

/** "May 2026 Primary" — election shorthand for page titles. */
export const electionShortLabel = (isoDate: string, type: ElectionType | string): string =>
  `${formatMonthYear(isoDate)} ${formatElectionType(type)}`;

/** "May 2026" from "2026-05" */
export const formatMonthLabel = (yearMonth: string): string => {
  const [y = '', m = '01'] = yearMonth.split('-');
  return `${MONTH_NAMES[Number(m) - 1] ?? m} ${y}`;
};

/** "May '26" from "2026-05" — compact axis label. */
export const formatMonthShort = (yearMonth: string): string => {
  const [y = '', m = '01'] = yearMonth.split('-');
  return `${MONTH_ABBR[Number(m) - 1] ?? m} ’${y.slice(2)}`;
};

/** Race display name: office plus location when present. */
export const raceDisplayName = (office: string, location: string): string =>
  location ? `${office} — ${location}` : office;

/** Pretty labels for KREF contribution-type codes. */
const CONTRIBUTION_TYPE_LABEL: Record<string, string> = {
  INDIVIDUAL: 'Individual',
  CANDIDATE: 'Candidate (self)',
  UNITEMIZED: 'Unitemized',
  ANONYMOUS: 'Anonymous',
  CASH: 'Cash',
  KYPAC: 'Kentucky PAC',
  OTHER_CANDIDATES: 'Other candidate',
  CONTRIBUTINGORGANIZATION: 'Organization',
  CAUCUS_CAMP_COMM: 'Caucus committee',
  EXECUTIVECOMM: 'Executive committee',
  INTEREST: 'Interest',
  OTHER: 'Other',
};

export const formatContributionType = (type: string): string => {
  const known = CONTRIBUTION_TYPE_LABEL[type];
  if (known) return known;
  const lower = type.replace(/_/g, ' ').toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

/** Pretty labels for contribution mode codes. */
const MODE_LABEL: Record<string, string> = {
  DIRECT: 'Direct',
  EVENT_FUNDRAISING: 'Event fundraising',
  LOAN: 'Loan',
  LOAN_REPAYMENT: 'Loan repayment',
  TRANSFER: 'Transfer',
};

export const formatMode = (mode: string): string => MODE_LABEL[mode] ?? formatContributionType(mode);
