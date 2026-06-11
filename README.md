# KREF Watch

**krefwatch.com — Who funds Kentucky politics.**

A statewide Kentucky campaign-finance tracker built on Kentucky Registry of Election
Finance (KREF) public records, 2016–present. Browse any election by race, candidate,
donor, or employer. An independent project of [The Lexington Times](https://lexingtonky.news).

## Stack

Vite + React 18 + TypeScript (strict) + React Router v6. No backend — the SPA consumes
static JSON generated into `public/data/` by the data pipeline. No chart or UI
framework; tables and the monthly money chart are hand-rolled (the chart is a small SVG).

## Commands

```bash
npm install
npm run dev        # dev server on http://localhost:5173
npm run build      # tsc + vite build → dist/
npm run preview    # serve the production build locally
npm run test:unit  # Vitest unit suite (data utilities)
```

## Data pipeline

The data layer lives in `data/` (raw exports), `scripts/`, and `public/data/`
(generated JSON the app fetches). To refresh:

```bash
scripts/fetch-kref.sh         # export per-election CSVs from KREF's public search
node scripts/build-data.mjs   # normalize + aggregate → public/data/
```

Generated layout:

- `public/data/elections.json` — election index (+ `generatedAt`, shown in the footer)
- `public/data/e/<date>/summary.json` — per-election KPIs, top lists (incl. `topSelfFunders`,
  `selfFundingTotal`, `unitemizedTotal`), monthly series
- `public/data/e/<date>/races.json` — all races with per-candidate totals
- `public/data/e/<date>/donors.json` — all donor identities incl. pipeline-computed
  `employerKey` (large; lazy-fetched only on donor/employer views, cached in-module)
- `public/data/e/<date>/employers.json` — pipeline-normalized employer rollup (the single
  source of truth for employer grouping — the SPA never re-normalizes client-side)
- `public/data/e/<date>/candidates/<slug>.json` — per-candidate itemized contributions

`public/data/` and `data/raw/` are intentionally untracked (see `.gitignore`); run the
pipeline before building a deployable artifact.

## Deploying

Deploys as static hosting on AWS Amplify. Because this is an SPA with client-side
routing, configure a rewrite in the Amplify console (App settings → Rewrites and
redirects): all paths not matching a file extension rewrite to `/index.html` with a
`200`. Amplify's documented SPA rule works as-is — make sure `json` stays in the
file-extension exclusion list so `/data/**` is served directly.

## Notes

- Donor identity grouping is by reported name. Employer normalization lives exclusively
  in the pipeline (`scripts/employer-normalize.mjs`); the SPA consumes `employerKey` and
  `employers.json` verbatim. Synthetic rows (unitemized bundles, self-funding,
  anonymous/cash) are tagged in the UI, excluded from the donors page's default list
  (toggle to re-include), and never link to donor pages.
- The open JSON under `/data/` is the whole machine-readable API (no backend);
  `public/llms.txt` and `public/skill.md` document it for AI agents.
- See `/about` in the app for full methodology and caveats.
