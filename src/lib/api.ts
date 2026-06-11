import type { CandidateFile, Donor, ElectionsIndex, ElectionSummary, EmployerRollup, Race } from './types';

const DATA_BASE = `${import.meta.env.BASE_URL}data`;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}) loading ${path}`);
  }
  return (await res.json()) as T;
}

/**
 * Module-level promise caches, keyed by election date (or date/slug),
 * so switching back to an already-visited election is instant and
 * concurrent loads of the same file dedupe to one request.
 * Failed loads are evicted so a retry can succeed.
 */
function cachedFetch<T>(cache: Map<string, Promise<T>>, key: string, path: string): Promise<T> {
  const existing = cache.get(key);
  if (existing) return existing;
  const promise = fetchJson<T>(path).catch((err: unknown) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, promise);
  return promise;
}

let electionsPromise: Promise<ElectionsIndex> | null = null;
const summaryCache = new Map<string, Promise<ElectionSummary>>();
const racesCache = new Map<string, Promise<Race[]>>();
const donorsCache = new Map<string, Promise<Donor[]>>();
const employersCache = new Map<string, Promise<EmployerRollup[]>>();
const candidateCache = new Map<string, Promise<CandidateFile>>();

export function getElections(): Promise<ElectionsIndex> {
  if (!electionsPromise) {
    electionsPromise = fetchJson<ElectionsIndex>(`${DATA_BASE}/elections.json`).catch((err: unknown) => {
      electionsPromise = null;
      throw err;
    });
  }
  return electionsPromise;
}

export const getSummary = (date: string): Promise<ElectionSummary> =>
  cachedFetch(summaryCache, date, `${DATA_BASE}/e/${date}/summary.json`);

export const getRaces = (date: string): Promise<Race[]> =>
  cachedFetch(racesCache, date, `${DATA_BASE}/e/${date}/races.json`);

/** Big file (multi-MB on large elections) — only call from donor/employer views. */
export const getDonors = (date: string): Promise<Donor[]> =>
  cachedFetch(donorsCache, date, `${DATA_BASE}/e/${date}/donors.json`);

/** Pipeline-generated employer rollup — the single source of truth for employer grouping. */
export const getEmployers = (date: string): Promise<EmployerRollup[]> =>
  cachedFetch(employersCache, date, `${DATA_BASE}/e/${date}/employers.json`);

export const getCandidate = (date: string, slug: string): Promise<CandidateFile> =>
  cachedFetch(candidateCache, `${date}/${slug}`, `${DATA_BASE}/e/${date}/candidates/${slug}.json`);
