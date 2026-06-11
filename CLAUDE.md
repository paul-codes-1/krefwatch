# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## What This Is

**KREF Watch** (krefwatch.com) — a statewide Kentucky campaign-finance tracker built on
Kentucky Registry of Election Finance (KREF) public records, 2016–present. Statewide
sibling of the LFUCG-only tracker in `~/lt/contributors` (app.lexingtonky.news). Built
2026-06-11 at Bruce Maples' (Forward Kentucky) suggestion.

Three layers, all in this repo:
1. **Fetch** — `scripts/fetch-kref.sh` downloads one statewide CSV per election date from
   KREF's public export endpoint into `data/raw/YYYY-MM-DD.csv` (idempotent; skips existing).
2. **Build** — `node scripts/build-data.mjs` turns the raw CSVs into the static JSON the
   SPA serves under `public/data/` (per-election summary/races/donors/employers + per-candidate
   shards + global `elections.json` / `candidates-index.json`).
3. **SPA** — Vite + React 18 + TS strict, custom CSS (no MUI). `npm run dev` / `npm run build`.

## The KREF export endpoint (the whole acquisition story)

```
https://secure.kentucky.gov/kref/publicsearch/ExportContributors?ElectionDate=MM%2FDD%2FYYYY%2000%3A00%3A00&ContributionSearchType=All
```

One GET per election date returns the FULL statewide contributions CSV (no auth, no bot
challenge as of 2026-06). Election dates are enumerable via
`/kref/publicsearch/GetAllElectionDates` (goes back to 1983). To add a new election, append
the date to the `DATES` array in `scripts/fetch-kref.sh`.

## Refresh workflow

```bash
rm data/raw/2026-05-19.csv          # force re-download of cycles still receiving filings
./scripts/fetch-kref.sh
node scripts/build-data.mjs
npm run build
# deploy: see Deploy below
```

## Key invariants

- **Employer normalization lives in the pipeline only** (`scripts/employer-normalize.mjs`).
  The SPA consumes pipeline-computed `employerKey` values and `employers.json` — it must
  NEVER re-normalize client-side (that's how the old LFUCG tracker drifted).
- **Synthetic donor keys** (`candidate-self-`, `unitemized-`, `anonymous-`, `cash-unnamed-`,
  `unnamed-`) are not people. `summary.json` `topDonors` excludes them at the pipeline;
  the donors page excludes them by default with a toggle.
- **`public/data/` and `data/raw/` are generated and git-ignored** — rebuildable from the
  fetch + build scripts.
- `public/llms.txt` + `public/skill.md` are the AI-agent surface. The open JSON under
  `/data/` IS the API — there is deliberately no MCP server / no backend (Paul's call,
  2026-06-11).

## Deploy (AWS Amplify, manual zip deploys — no git hookup)

- Amplify app id: `d21vwc9tx0yz7a` (us-east-1), branch `main`, default domain
  `d21vwc9tx0yz7a.amplifyapp.com`, custom domain `krefwatch.com` (Route 53, same account,
  hosted zone `Z0446155MTHAEGO3HCHM`; registered 2026-06-11, auto-renew on).
- SPA rewrite rule is configured on the app (excludes json/md/txt/xml so `/data/*`,
  `llms.txt`, `skill.md` serve directly).
- Deploy: `./deploy/deploy.sh` (builds, zips dist, create-deployment → PUT zip →
  start-deployment).
- **Paul handles deploys** unless he explicitly says otherwise.

## Caveats baked into the About page (keep them true)

Filings lag; donor identity grouped by name (merge/split risk); employer values self-reported,
normalized heuristically; amounts as-filed incl. refunds; federal races are FEC, not KREF.

## When stuck

Stop and ask Paul. This is a public site with The Lexington Times' name on it — don't invent
data semantics.
