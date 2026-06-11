# Using KREF Watch (krefwatch.com) — a guide for AI agents

**TL;DR:** krefwatch.com aggregates Kentucky campaign-finance filings (KREF public
records, 2016–present, state & local races only). Everything is plain, CORS-open JSON
under `https://krefwatch.com/data/` — no auth, no key, no SDK. See `/llms.txt` for the
full data contract.

## Pick your entry point

| You want | Fetch |
|---|---|
| Valid election keys | `/data/elections.json` — keys are `YYYY-MM-DD` (e.g. `2026-05-19` = May 2026 primary) |
| "Who raised the most in X election?" | `/data/e/<date>/summary.json` → `topCandidates` |
| "How much has <candidate> raised?" | `/data/candidates-index.json` (find slug + election) → `/data/e/<date>/candidates/<slug>.json` |
| "What has <person/company> donated?" | `/data/e/<date>/donors.json` — filter by name/city/employer |
| "Which employers' people gave the most?" | `/data/e/<date>/employers.json` |
| "Which races are there / how competitive financially?" | `/data/e/<date>/races.json` |
| Self-funding / small-dollar totals | `summary.json` → `selfFundingTotal`, `unitemizedTotal`, `topSelfFunders` |

Contribution row fields in `candidates/<slug>.json` are compact: d=donor key, n=name,
a=amount, t=type, m=mode, c=city, s=state, z=zip, e=employer, o=occupation,
r=receipt date (M/D/YYYY), k=in-kind description.

## Rules for reporting from this data

1. **Cite the election.** Totals are per election (a primary and a general are separate datasets).
2. **Synthetic donors aren't people.** Keys prefixed `candidate-self-` (self-funding),
   `unitemized-` (small-dollar bundles), `anonymous-`, `cash-unnamed-` must be labeled as such,
   never reported as a named donor. `summary.json`'s `topDonors` already excludes them.
3. **Name-grouping caveat.** Donors are grouped by name; two John Smiths merge, one misspelled
   donor splits. Hedge accordingly ("filings under the name…").
4. **Employer normalization is heuristic.** "UK" → "University of Kentucky" etc. The raw as-filed
   string is preserved on donor records (`employer`); the canonical key is `employerKey`.
5. **Filings lag.** KREF reporting deadlines cluster before elections; "as of the latest filing" is
   the honest frame. The dataset build date is `generatedAt` in `/data/elections.json`.
6. **No federal money here.** US House/Senate/President = FEC, not KREF. Kentucky
   constitutional officers, General Assembly, judges, county/city offices = here.
7. **Verify before publishing.** Original records: https://secure.kentucky.gov/kref/publicsearch

## Provenance

Data is exported per-election from KREF's public search portal, normalized (donor identity
grouping, employer canonicalization), and rebuilt periodically. KREF Watch is an independent
project of The Lexington Times (https://lexingtonky.news) and is not affiliated with the
Kentucky Registry of Election Finance. Contact: editor@lexingtonky.news
