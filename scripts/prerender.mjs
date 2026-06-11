// prerender.mjs — SEO layer. Run AFTER `vite build`.
//
// For every crawlable route, writes dist/<route>/index.html: the built SPA shell
// with route-specific <title>/<meta>/<link rel=canonical>/OG tags/JSON-LD and a
// crawler-visible content block inside #root (replaced by React on mount — no
// hydration, so no mismatch concerns). Also emits sitemap.xml + robots.txt.
//
// Amplify serves real files before applying the SPA rewrite, so these static
// pages win for crawlers and deep links automatically.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const DATA = path.join(DIST, 'data');
const BASE = 'https://krefwatch.com';

const rawTemplate = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
if (rawTemplate.includes('data-prerendered')) {
  console.error('dist/index.html was already prerendered — run `npm run build` first (prerender overwrites it).');
  process.exit(1);
}
// Strip the static description/OG/twitter metas — each route injects its own.
const template = rawTemplate
  .replace(/^\s*<meta\s+(name="(description|twitter:[^"]*)"|property="og:[^"]*")[\s\S]*?\/?>\n?/gm, '')
  .replace('</head>', '<meta name="generator" content="kref-tracker" data-prerendered>\n  </head>');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(DATA, p), 'utf8'));

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const typeLabel = (t) => t.charAt(0) + t.slice(1).toLowerCase();
const electionLabel = (e) => {
  const [y, m] = e.date.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y} ${typeLabel(e.electionType)}`;
};
const titleCase = (s) =>
  String(s).toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
const raceName = (r) => titleCase(r.office) + (r.location ? ` — ${titleCase(r.location)}` : '');

let pageCount = 0;
const sitemapUrls = [];

/** Render one page: head swaps + crawler content inside #root. */
function writePage(route, { title, description, jsonLd, body, priority = 0.5 }) {
  const url = BASE + route;
  const head = [
    `<meta name="description" content="${esc(description)}">`,
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:site_name" content="KREF Watch">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:image" content="${BASE}/og-card.png">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${BASE}/og-card.png">`,
    ...(jsonLd ? [`<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`] : []),
  ].join('\n    ');

  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description"[^>]*>\n?/g, '')
    .replace(/<link rel="canonical"[^>]*>\n?/g, '')
    .replace('</head>', `    ${head}\n  </head>`);

  // Crawler-visible content: lives inside #root, replaced when React mounts.
  html = html.replace(
    /(<div id="root">)([\s\S]*?)(<\/div>)/,
    (_, open, _inner, close) => `${open}${body}${close}`,
  );

  const dir = route === '/' ? DIST : path.join(DIST, route.slice(1));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  sitemapUrls.push({ url, priority });
  pageCount++;
}

const breadcrumbs = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name,
    ...(url ? { item: BASE + url } : {}),
  })),
});

const linkList = (items) =>
  `<ul>${items.map(([href, text, extra]) => `<li><a href="${esc(href)}">${esc(text)}</a>${extra ? ` — ${esc(extra)}` : ''}</li>`).join('')}</ul>`;

const footerNote = `<p>Data: <a href="https://secure.kentucky.gov/kref/publicsearch">Kentucky Registry of Election Finance public records</a>. KREF Watch is an independent project of <a href="https://lexingtonky.news">The Lexington Times</a>.</p>`;

// ---------- load data ----------
const { elections, generatedAt } = readJson('elections.json');
const latest = elections.find((e) => e.contributionCount > 1000) ?? elections[0];

// ---------- per-election pages ----------
for (const e of elections) {
  const label = electionLabel(e);
  const summary = readJson(`e/${e.date}/summary.json`);
  const races = readJson(`e/${e.date}/races.json`);

  const overviewBody = `
<header><h1>Kentucky campaign finance — ${esc(label)} election</h1>
<p>${esc(money(summary.totalAmount))} raised across ${summary.contributionCount.toLocaleString()} contributions to ${summary.candidateCount.toLocaleString()} candidates in ${summary.raceCount.toLocaleString()} races, per filings with the Kentucky Registry of Election Finance.</p></header>
<h2>Top fundraisers</h2>
${linkList(summary.topCandidates.slice(0, 25).map((c) => [`/e/${e.date}/candidates/${c.slug}`, `${c.name} (${titleCase(c.office)}${c.location ? ', ' + titleCase(c.location) : ''})`, money(c.total)]))}
<h2>Explore</h2>
${linkList([
    [`/e/${e.date}/races`, `All ${label} races`],
    [`/e/${e.date}/donors`, `${label} donor search`],
    [`/e/${e.date}/employers`, `${label} top employers`],
    ...elections.filter((o) => o !== e).slice(0, 30).map((o) => [`/e/${o.date}`, `${electionLabel(o)} election money`]),
    ['/about', 'About this data'],
  ])}
${footerNote}`;

  const overviewMeta = {
    title: `Kentucky Campaign Finance — ${label} | KREF Watch`,
    description: `Who funds Kentucky politics: ${money(summary.totalAmount)} raised by ${summary.candidateCount.toLocaleString()} candidates in the ${label} election. Searchable KREF contribution data — every donor, every race.`,
    jsonLd: breadcrumbs([['KREF Watch', '/'], [label, `/e/${e.date}`]]),
    body: overviewBody,
    priority: 0.9,
  };
  writePage(`/e/${e.date}`, overviewMeta);
  if (e.date === latest.date) {
    writePage('/', {
      ...overviewMeta,
      title: `KREF Watch — Who Funds Kentucky Politics | Kentucky Campaign Finance Tracker`,
      description: `Searchable Kentucky campaign finance data from KREF filings, 2016–present. ${money(summary.totalAmount)} raised in the ${label} election alone — explore every donor, candidate, race, and employer.`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: 'Kentucky campaign contributions (KREF filings), 2016–present',
        description: 'Itemized campaign contributions to Kentucky state and local candidates, aggregated from Kentucky Registry of Election Finance public records across 28 elections.',
        url: BASE,
        isAccessibleForFree: true,
        creator: { '@type': 'Organization', name: 'The Lexington Times', url: 'https://lexingtonky.news' },
        license: 'https://krefwatch.com/about',
        distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: `${BASE}/data/elections.json` }],
        temporalCoverage: '2016/2026',
        spatialCoverage: { '@type': 'Place', name: 'Kentucky, United States' },
        dateModified: generatedAt,
      },
      priority: 1.0,
    });
  }

  // races index
  writePage(`/e/${e.date}/races`, {
    title: `${label} Races — Kentucky Campaign Money by Race | KREF Watch`,
    description: `Campaign fundraising in all ${races.length} ${label} races in Kentucky — compare candidates' money in every contest, from statewide offices to county races.`,
    jsonLd: breadcrumbs([['KREF Watch', '/'], [label, `/e/${e.date}`], ['Races', `/e/${e.date}/races`]]),
    body: `<h1>${esc(label)} election — money by race</h1>
${linkList(races.map((r) => [`/e/${e.date}/races/${r.slug}`, raceName(r), `${money(r.total)} · ${r.candidates.length} candidate${r.candidates.length === 1 ? '' : 's'}`]))}
<p><a href="/e/${e.date}">Back to ${esc(label)} overview</a></p>${footerNote}`,
    priority: 0.7,
  });

  // race detail pages
  for (const r of races) {
    const rn = raceName(r);
    writePage(`/e/${e.date}/races/${r.slug}`, {
      title: `${rn} — ${label} Campaign Money | KREF Watch`,
      description: `${money(r.total)} raised by ${r.candidates.length} candidate${r.candidates.length === 1 ? '' : 's'} in the ${rn} race, ${label} election, per KREF filings: ${r.candidates.slice(0, 3).map((c) => c.name).join(', ')}.`,
      jsonLd: breadcrumbs([['KREF Watch', '/'], [label, `/e/${e.date}`], ['Races', `/e/${e.date}/races`], [rn, `/e/${e.date}/races/${r.slug}`]]),
      body: `<h1>${esc(rn)} — ${esc(label)}</h1>
<p>${esc(money(r.total))} raised across ${r.count.toLocaleString()} contributions in this race.</p>
${linkList(r.candidates.map((c) => [`/e/${e.date}/candidates/${c.slug}`, `${c.name} — campaign contributions`, money(c.total)]))}
<p><a href="/e/${e.date}/races">All ${esc(label)} races</a></p>${footerNote}`,
      priority: 0.6,
    });
  }

  // candidate pages
  const candDir = path.join(DATA, 'e', e.date, 'candidates');
  for (const f of fs.readdirSync(candDir)) {
    const c = JSON.parse(fs.readFileSync(path.join(candDir, f), 'utf8'));
    const officeStr = `${titleCase(c.office)}${c.location ? ', ' + titleCase(c.location) : ''}`;
    const top = c.contributions.slice(0, 25);
    writePage(`/e/${e.date}/candidates/${c.slug}`, {
      title: `${c.name} Campaign Contributions — ${officeStr}, ${label} | KREF Watch`,
      description: `${c.name} raised ${money(c.total)} from ${c.count.toLocaleString()} contributions running for ${officeStr} in the ${label} election. See every itemized donor, per KREF filings.`,
      jsonLd: breadcrumbs([['KREF Watch', '/'], [label, `/e/${e.date}`], [c.name, `/e/${e.date}/candidates/${c.slug}`]]),
      body: `<h1>${esc(c.name)} — campaign contributions</h1>
<p>${esc(c.name)} raised ${esc(money(c.total))} from ${c.count.toLocaleString()} contributions running for ${esc(officeStr)} in the ${esc(label)} election, per filings with the Kentucky Registry of Election Finance.</p>
<h2>Largest contributions</h2>
<table><thead><tr><th>Contributor</th><th>Amount</th><th>Type</th><th>City</th><th>Employer</th><th>Date</th></tr></thead><tbody>
${top.map((x) => `<tr><td>${esc(x.n)}</td><td>${esc(money(x.a))}</td><td>${esc(x.t)}</td><td>${esc(x.c || '')}</td><td>${esc(x.e || '')}</td><td>${esc(x.r || '')}</td></tr>`).join('')}
</tbody></table>
<p><a href="/e/${e.date}">All ${esc(label)} fundraising</a> · <a href="/e/${e.date}/races">${esc(label)} races</a></p>${footerNote}`,
      priority: 0.6,
    });
  }

  // donors + employers indexes
  writePage(`/e/${e.date}/donors`, {
    title: `${label} Donor Search — Who Gave to Kentucky Campaigns | KREF Watch`,
    description: `Search ${summary.namedDonorCount.toLocaleString()} named donors to Kentucky campaigns in the ${label} election by name, city, or employer. ${money(summary.totalAmount)} in tracked giving.`,
    jsonLd: breadcrumbs([['KREF Watch', '/'], [label, `/e/${e.date}`], ['Donors', `/e/${e.date}/donors`]]),
    body: `<h1>${esc(label)} — donor search</h1>
<p>Search ${summary.namedDonorCount.toLocaleString()} named donors. Top donors:</p>
${linkList(summary.topDonors.map((d) => [`/e/${e.date}/donors`, d.name, money(d.total)]))}
<p><a href="/e/${e.date}">Back to ${esc(label)} overview</a></p>${footerNote}`,
    priority: 0.5,
  });
  writePage(`/e/${e.date}/employers`, {
    title: `${label} Top Employers — Where Kentucky Campaign Money Works | KREF Watch`,
    description: `Which employers' people gave the most to Kentucky campaigns in the ${label} election — ${summary.topEmployers.slice(0, 3).map((x) => x.name).join(', ')} and more, per KREF filings.`,
    jsonLd: breadcrumbs([['KREF Watch', '/'], [label, `/e/${e.date}`], ['Employers', `/e/${e.date}/employers`]]),
    body: `<h1>${esc(label)} — contributions by employer</h1>
${linkList(summary.topEmployers.map((x) => [`/e/${e.date}/employers`, x.name, `${money(x.total)} from ${x.donorCount} donors`]))}
<p><a href="/e/${e.date}">Back to ${esc(label)} overview</a></p>${footerNote}`,
    priority: 0.5,
  });
}

// ---------- about ----------
writePage('/about', {
  title: 'About KREF Watch — Methodology & Data Sources | Kentucky Campaign Finance',
  description: 'How KREF Watch aggregates Kentucky Registry of Election Finance filings into a searchable campaign-finance tracker: methodology, caveats, and the open JSON data API.',
  jsonLd: breadcrumbs([['KREF Watch', '/'], ['About', '/about']]),
  body: `<h1>About KREF Watch</h1>
<p>KREF Watch is a searchable aggregation of contribution filings to Kentucky state and local campaigns, 2016–present, built from Kentucky Registry of Election Finance public records by <a href="https://lexingtonky.news">The Lexington Times</a>. The full dataset is an open JSON API — see <a href="/llms.txt">llms.txt</a> and <a href="/skill.md">the agent guide</a>.</p>
${linkList(elections.map((o) => [`/e/${o.date}`, `${electionLabel(o)} election money`]))}`,
  priority: 0.8,
});

// ---------- sitemap + robots ----------
const today = (generatedAt || new Date().toISOString()).slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(({ url, priority }) => `<url><loc>${esc(url)}</loc><lastmod>${today}</lastmod><priority>${priority}</priority></url>`).join('\n')}
</urlset>`;
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap, 'utf8');
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`, 'utf8');

console.log(`Prerendered ${pageCount} pages, sitemap with ${sitemapUrls.length} URLs.`);
