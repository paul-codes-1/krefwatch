// build-data.mjs
// Reads statewide KREF export CSVs from data/raw/*.csv (one per election date,
// named YYYY-MM-DD.csv) and emits the static JSON dataset the SPA serves:
//
//   public/data/elections.json                  — index of all elections
//   public/data/e/<date>/summary.json           — KPIs, top lists, rollups, monthly series
//   public/data/e/<date>/races.json             — every race with per-candidate totals
//   public/data/e/<date>/donors.json            — per-donor aggregates (search corpus)
//   public/data/e/<date>/candidates/<slug>.json — full contribution rows per candidate
//
// All output is compact JSON; Amplify/CloudFront compression handles the wire size.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeEmployer } from './employer-normalize.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_DIR = path.join(__dirname, '..', 'data', 'raw');
const OUT_DIR = path.join(__dirname, '..', 'public', 'data');

// ---------- CSV parsing (RFC 4180) ----------
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// ---------- normalization (mirrors contributors repo src/data/utils.ts) ----------
const slugify = (value) =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'unknown';

const buildFullName = (first, last) => [first, last].filter(Boolean).join(' ').trim();

/** Synthetic donor keys (bundles, self-funding, unnamed) — excluded from named-donor views. */
const SYNTHETIC_KEY_RE = /^(anonymous|cash-unnamed|unnamed|unitemized|candidate-self)-/;

const buildIdentityKey = ({ hasName, hasOrg, contributorFullName, contributionType, recipientKey, index }) => {
  if (hasName || hasOrg) return slugify(contributorFullName) || `missing-${index}`;
  switch (contributionType) {
    case 'CANDIDATE':
      return `candidate-self-${recipientKey}`;
    case 'UNITEMIZED':
      return `unitemized-${recipientKey}`;
    case 'ANONYMOUS':
      return `anonymous-${index}`;
    case 'CASH':
      return `cash-unnamed-${index}`;
    default:
      return `unnamed-${index}`;
  }
};

const parseAmount = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Receipt dates come as M/D/YYYY → return YYYY-MM for monthly bucketing, '' if unparseable.
const receiptMonth = (v) => {
  const m = String(v || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${String(m[1]).padStart(2, '0')}`;
};

const writeJson = (file, obj) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj), 'utf8');
};

const round2 = (n) => Math.round(n * 100) / 100;

// ---------- per-election processing ----------
function processElection(dateKey, csvPath) {
  const text = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(text);
  if (rows.length < 2) return null;
  const headers = rows[0].map((h) => h.replace(/^﻿/, ''));
  const col = Object.fromEntries(headers.map((h, i) => [h, i]));
  const get = (row, name) => (row[col[name]] ?? '').trim();

  const electionType = get(rows[1], 'Election Type') || 'UNKNOWN';

  // Pass 1: candidates keyed by name+office+location, races keyed by office+location.
  const candidates = new Map(); // candKey -> {name, office, location, slug, total, count, rows: []}
  const races = new Map(); // raceSlug -> {office, location, candidates:Set}
  const donors = new Map(); // identityKey -> donor aggregate
  const employers = new Map(); // employerKey -> {name, total, count, donors:Set}
  const byType = new Map();
  const byOffice = new Map();
  const monthly = new Map();
  let totalAmount = 0;
  let contributionCount = 0;

  const candKeyOf = (name, office, location) => `${slugify(name)}|${office}|${location}`;

  // Assign URL slugs: candidate name slug, disambiguated by office when names collide.
  const slugCounts = new Map();
  const dataRows = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length <= 1) continue;
    dataRows.push(row);
    const name = buildFullName(get(row, 'Recipient First Name'), get(row, 'Recipient Last Name')) ||
      get(row, 'To Organization') || 'Unknown';
    const office = get(row, 'Office Sought') || 'UNKNOWN OFFICE';
    const location = get(row, 'Location');
    const k = candKeyOf(name, office, location);
    if (!candidates.has(k)) {
      const nameSlug = slugify(name);
      slugCounts.set(nameSlug, (slugCounts.get(nameSlug) || 0) + 1);
      candidates.set(k, { name, office, location, nameSlug, slug: '', total: 0, count: 0, rows: [] });
    }
  }
  for (const c of candidates.values()) {
    c.slug = slugCounts.get(c.nameSlug) > 1 ? slugify(`${c.name} ${c.office} ${c.location}`) : c.nameSlug;
  }

  // Pass 2: aggregate.
  let idx = 0;
  for (const row of dataRows) {
    idx++;
    const amount = parseAmount(get(row, 'Amount'));
    const contributionType = get(row, 'Contribution Type');
    const mode = get(row, 'Contribution Mode');
    const office = get(row, 'Office Sought') || 'UNKNOWN OFFICE';
    const location = get(row, 'Location');
    const recipName = buildFullName(get(row, 'Recipient First Name'), get(row, 'Recipient Last Name')) ||
      get(row, 'To Organization') || 'Unknown';
    const cand = candidates.get(candKeyOf(recipName, office, location));

    const orgName = get(row, 'From Organization Name');
    const first = get(row, 'Contributor First Name');
    const last = get(row, 'Contributor Last Name');
    const personName = buildFullName(first, last);
    const contributorName = personName || orgName;
    const identityKey = buildIdentityKey({
      hasName: Boolean(personName),
      hasOrg: Boolean(orgName),
      contributorFullName: contributorName,
      contributionType,
      recipientKey: cand.slug,
      index: idx,
    });

    const city = get(row, 'City');
    const state = get(row, 'State');
    const zip = get(row, 'Zip');
    const employerRaw = get(row, 'Employer');
    const occupation = get(row, 'Occupation') || get(row, 'Other Occupation');
    const receiptDate = get(row, 'Receipt Date');
    const inKind = get(row, 'In kind Description');

    totalAmount += amount;
    contributionCount++;

    cand.total += amount;
    cand.count++;
    cand.rows.push({
      d: identityKey,
      n: contributorName || contributionType || 'Unnamed',
      a: round2(amount),
      t: contributionType,
      m: mode,
      c: city,
      s: state,
      z: zip,
      e: employerRaw,
      o: occupation,
      r: receiptDate,
      k: inKind,
    });

    const raceSlug = slugify(`${office} ${location}`);
    if (!races.has(raceSlug)) races.set(raceSlug, { office, location, slug: raceSlug, candidates: new Set() });
    races.get(raceSlug).candidates.add(candKeyOf(recipName, office, location));

    const empNorm = normalizeEmployer(employerRaw);

    let donor = donors.get(identityKey);
    if (!donor) {
      donor = {
        key: identityKey,
        name: contributorName || (contributionType === 'CANDIDATE' ? `${recipName} (self)` : contributionType === 'UNITEMIZED' ? `Unitemized — ${recipName}` : contributionType || 'Unnamed'),
        city,
        state,
        employer: employerRaw,
        employerKey: empNorm ? empNorm.key : '',
        occupation,
        total: 0,
        count: 0,
        recipients: new Map(),
      };
      donors.set(identityKey, donor);
    }
    donor.total += amount;
    donor.count++;
    if (!donor.city && city) donor.city = city;
    if (!donor.employer && employerRaw) donor.employer = employerRaw;
    if (!donor.employerKey && empNorm) donor.employerKey = empNorm.key;
    if (!donor.occupation && occupation) donor.occupation = occupation;
    const rk = donor.recipients.get(cand.slug) || { name: recipName, office, location, total: 0, count: 0 };
    rk.total += amount;
    rk.count++;
    donor.recipients.set(cand.slug, rk);

    if (empNorm) {
      let emp = employers.get(empNorm.key);
      if (!emp) {
        emp = { key: empNorm.key, total: 0, count: 0, donors: new Set(), variants: new Map() };
        employers.set(empNorm.key, emp);
      }
      emp.total += amount;
      emp.count++;
      emp.donors.add(identityKey);
      emp.variants.set(empNorm.display, (emp.variants.get(empNorm.display) || 0) + 1);
    }

    byType.set(contributionType, (byType.get(contributionType) || 0) + amount);
    byOffice.set(office, (byOffice.get(office) || 0) + amount);
    const month = receiptMonth(receiptDate);
    if (month) monthly.set(month, round2((monthly.get(month) || 0) + amount));
  }

  // ---------- emit ----------
  const eDir = path.join(OUT_DIR, 'e', dateKey);
  const candList = [...candidates.values()].sort((a, b) => b.total - a.total);

  // candidates/<slug>.json
  for (const c of candList) {
    c.rows.sort((a, b) => b.a - a.a);
    writeJson(path.join(eDir, 'candidates', `${c.slug}.json`), {
      name: c.name,
      office: c.office,
      location: c.location,
      slug: c.slug,
      total: round2(c.total),
      count: c.count,
      contributions: c.rows,
    });
  }

  // races.json
  const raceList = [...races.values()]
    .map((r) => {
      const cands = [...r.candidates]
        .map((k) => candidates.get(k))
        .sort((a, b) => b.total - a.total)
        .map((c) => ({ name: c.name, slug: c.slug, total: round2(c.total), count: c.count }));
      return {
        office: r.office,
        location: r.location,
        slug: r.slug,
        total: round2(cands.reduce((s, c) => s + c.total, 0)),
        count: cands.reduce((s, c) => s + c.count, 0),
        candidates: cands,
      };
    })
    .sort((a, b) => b.total - a.total);
  writeJson(path.join(eDir, 'races.json'), raceList);

  // donors.json — search corpus, sorted by total desc
  const donorList = [...donors.values()]
    .sort((a, b) => b.total - a.total)
    .map((d) => ({
      key: d.key,
      name: d.name,
      city: d.city,
      state: d.state,
      employer: d.employer,
      employerKey: d.employerKey,
      occupation: d.occupation,
      total: round2(d.total),
      count: d.count,
      recipients: [...d.recipients.entries()]
        .map(([slug, r]) => ({ slug, name: r.name, office: r.office, location: r.location, total: round2(r.total), count: r.count }))
        .sort((a, b) => b.total - a.total),
    }));
  writeJson(path.join(eDir, 'donors.json'), donorList);

  // employers.json — canonical display = alias form or most common raw variant.
  // donorCount counts donors whose canonical employerKey is this employer (matching
  // what the employer-detail page lists); dollar totals stay per-contribution.
  const canonicalDonorCounts = new Map();
  for (const d of donors.values()) {
    if (d.employerKey) {
      canonicalDonorCounts.set(d.employerKey, (canonicalDonorCounts.get(d.employerKey) || 0) + 1);
    }
  }
  const empList = [...employers.values()]
    .map((e) => {
      const display = [...e.variants.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return { key: e.key, name: display, total: round2(e.total), count: e.count, donorCount: canonicalDonorCounts.get(e.key) || 0 };
    })
    .sort((a, b) => b.total - a.total);
  writeJson(path.join(eDir, 'employers.json'), empList);

  // summary.json
  const namedDonorCount = [...donors.values()].filter((d) => !SYNTHETIC_KEY_RE.test(d.key)).length;
  const namedDonorList = donorList.filter((d) => !SYNTHETIC_KEY_RE.test(d.key));
  const selfFundingTotal = round2(
    [...donors.values()].filter((d) => d.key.startsWith('candidate-self-')).reduce((s, d) => s + d.total, 0),
  );
  const unitemizedTotal = round2(
    [...donors.values()].filter((d) => d.key.startsWith('unitemized-')).reduce((s, d) => s + d.total, 0),
  );
  const topSelfFunders = donorList
    .filter((d) => d.key.startsWith('candidate-self-'))
    .slice(0, 10)
    .map((d) => {
      const r = d.recipients[0];
      return { candidateSlug: r?.slug ?? '', name: r?.name ?? d.name, office: r?.office ?? '', location: r?.location ?? '', total: round2(d.total), count: d.count };
    });
  writeJson(path.join(eDir, 'summary.json'), {
    date: dateKey,
    electionType,
    totalAmount: round2(totalAmount),
    contributionCount,
    candidateCount: candList.length,
    raceCount: raceList.length,
    donorCount: donors.size,
    namedDonorCount,
    selfFundingTotal,
    unitemizedTotal,
    topCandidates: candList.slice(0, 25).map((c) => ({
      name: c.name, slug: c.slug, office: c.office, location: c.location, total: round2(c.total), count: c.count,
    })),
    // Named donors only — self-funding and small-dollar bundles are reported separately.
    topDonors: namedDonorList.slice(0, 25).map(({ recipients, ...d }) => ({ ...d, recipientCount: recipients.length })),
    topSelfFunders,
    topEmployers: empList.slice(0, 25),
    byOffice: [...byOffice.entries()].map(([office, total]) => ({ office, total: round2(total) })).sort((a, b) => b.total - a.total),
    byContributionType: [...byType.entries()].map(([type, total]) => ({ type, total: round2(total) })).sort((a, b) => b.total - a.total),
    monthly: [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, total]) => ({ month, total })),
  });

  return {
    entry: {
      date: dateKey,
      electionType,
      totalAmount: round2(totalAmount),
      contributionCount,
      candidateCount: candList.length,
      raceCount: raceList.length,
    },
    candidates: candList.map((c) => ({
      date: dateKey,
      name: c.name,
      slug: c.slug,
      office: c.office,
      location: c.location,
      total: round2(c.total),
      count: c.count,
    })),
  };
}

// ---------- main ----------
const files = fs.readdirSync(RAW_DIR).filter((f) => /^\d{4}-\d{2}-\d{2}\.csv$/.test(f)).sort().reverse();
if (files.length === 0) {
  console.error(`No CSVs in ${RAW_DIR}`);
  process.exit(1);
}
fs.rmSync(path.join(OUT_DIR, 'e'), { recursive: true, force: true });
const index = [];
const allCandidates = [];
for (const f of files) {
  const dateKey = f.replace('.csv', '');
  const started = process.hrtime.bigint();
  const result = processElection(dateKey, path.join(RAW_DIR, f));
  if (!result) {
    console.log(`${dateKey}: empty, skipped`);
    continue;
  }
  const { entry, candidates } = result;
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  index.push(entry);
  allCandidates.push(...candidates);
  console.log(`${dateKey} (${entry.electionType}): ${entry.contributionCount} rows, $${entry.totalAmount.toLocaleString()}, ${entry.candidateCount} candidates, ${entry.raceCount} races [${ms.toFixed(0)}ms]`);
}
// Cross-election candidate index (powers global search + the MCP server).
writeJson(path.join(OUT_DIR, 'candidates-index.json'), allCandidates);
writeJson(path.join(OUT_DIR, 'elections.json'), {
  generatedAt: new Date().toISOString(),
  source: 'Kentucky Registry of Election Finance public records (secure.kentucky.gov/kref/publicsearch)',
  elections: index,
});
console.log(`\nWrote ${index.length} elections to ${OUT_DIR}`);
