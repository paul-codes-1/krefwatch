import type { CandidateFile, Donor, DonorLite, ElectionsIndex, ElectionSummary, EmployerRollup, Race } from './types';

const DATA_BASE = `${import.meta.env.BASE_URL}data`;

// Build-time constant (vite.config.ts `define`). Appended to every data URL so
// each deploy's bundle fetches URLs the edge cache has never seen — the CDN in
// front of krefwatch.com caches /data/*.json for a year (2026-09-18 incident:
// readers saw Sept. 14 races.json under the Sept. 18 prerendered HTML).
declare const __BUILD_ID__: string;
const BUILD_ID = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${path}${path.includes('?') ? '&' : '?'}v=${BUILD_ID}`);
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
const donorsLiteCache = new Map<string, Promise<DonorLite[]>>();
const donorShardCache = new Map<string, Promise<Donor[]>>();
const employersCache = new Map<string, Promise<EmployerRollup[]>>();
const candidateCache = new Map<string, Promise<CandidateFile>>();

// Donor shard assignment — MUST stay in sync with donorShard() in
// scripts/build-data.mjs (djb2 over the donor key, mod DONOR_SHARDS).
const DONOR_SHARDS = 64;
function donorShard(key: string): number {
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h * 33) ^ key.charCodeAt(i)) >>> 0;
  return h % DONOR_SHARDS;
}

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

/**
 * Slim donor corpus (no recipients arrays) for search + employer pages.
 * The full donors.json stays published as the open-data API but the SPA
 * never loads it — Googlebot re-fetching it per rendered page was the
 * bulk of the site's bandwidth bill (Aug 2026).
 */
export const getDonorsLite = (date: string): Promise<DonorLite[]> =>
  cachedFetch(donorsLiteCache, date, `${DATA_BASE}/e/${date}/donors-lite.json`);

/** The hash shard containing one donor's full record (with recipients). */
export const getDonorShardFor = (date: string, key: string): Promise<Donor[]> => {
  const n = donorShard(key);
  return cachedFetch(donorShardCache, `${date}/${n}`, `${DATA_BASE}/e/${date}/donors/shard-${n}.json`);
};

/** Pipeline-generated employer rollup — the single source of truth for employer grouping. */
export const getEmployers = (date: string): Promise<EmployerRollup[]> =>
  cachedFetch(employersCache, date, `${DATA_BASE}/e/${date}/employers.json`);

export const getCandidate = (date: string, slug: string): Promise<CandidateFile> =>
  cachedFetch(candidateCache, `${date}/${slug}`, `${DATA_BASE}/e/${date}/candidates/${slug}.json`);

/** klec-links.json: employer key -> the klecwatch.com year where its lobbying total is largest. */
export interface KlecLink {
  year: number;
  total: number;
}
let klecLinksPromise: Promise<Record<string, KlecLink>> | null = null;
export function getKlecLinks(): Promise<Record<string, KlecLink>> {
  if (!klecLinksPromise) {
    klecLinksPromise = fetchJson<Record<string, KlecLink>>(`${DATA_BASE}/klec-links.json`).catch(
      (err: unknown) => {
        klecLinksPromise = null;
        throw err;
      },
    );
  }
  return klecLinksPromise;
}
