import { usePageMeta } from '../hooks/usePageMeta';

export default function About() {
  usePageMeta(
    'About & methodology | KREF Watch',
    'How KREF Watch aggregates Kentucky Registry of Election Finance public records: donor identity grouping, employer normalization, synthetic-row labeling, caveats, and the open JSON data API.',
  );
  return (
    <div className="page container">
      <p className="kicker">Methodology &amp; disclosure</p>
      <h1 className="page-title">About KREF Watch</h1>

      <div className="prose">
        <h2>What this is</h2>
        <p>
          KREF Watch is a searchable aggregation of contribution filings to Kentucky state and local
          campaigns, 2016 to present, drawn from the Kentucky Registry of Election Finance’s public
          search. It exists so reporters, researchers, and ordinary Kentuckians can follow campaign
          money by election, race, candidate, donor, and employer without paging through raw filings.
        </p>

        <h2>How it’s built</h2>
        <p>
          Data is exported per-election from KREF’s public portal, then normalized and aggregated into
          the views on this site:
        </p>
        <ul>
          <li>
            <strong>Donor identity grouping</strong> — contributions are grouped into donor identities
            by reported name, so a donor’s gifts across candidates and filings roll up together.
          </li>
          <li>
            <strong>Employer canonicalization</strong> — employer spellings are normalized in the
            data pipeline with a statewide alias map (Commonwealth of Kentucky variants, UK/UofL/JCPS
            acronyms, law-firm suffix stripping) so that one employer’s donors group together. Junk
            values (“housewife”, “farmer”, “not disclosed”, retired/unemployed) are excluded from
            employer rollups.
          </li>
          <li>
            <strong>Synthetic rows are labeled</strong> — unitemized small-dollar bundles, candidate
            self-funding, and anonymous or unnamed cash contributions have no real named donor. They
            appear with a muted tag (e.g.&nbsp;“Small-dollar bundle”, “Self-funding”) and never link to
            a donor page.
          </li>
        </ul>

        <h2>Caveats — read before you publish</h2>
        <ul>
          <li>
            <strong>Filings lag.</strong> Reports are tied to pre-election deadlines; recent totals are
            incomplete until the next filing cycle lands.
          </li>
          <li>
            <strong>KREF data contains filer typos.</strong> Names, employers, cities, and occupations
            are entered by campaign treasurers, errors and all.
          </li>
          <li>
            <strong>Name-based grouping is imperfect.</strong> Grouping donors by name can merge two
            real people who share a name, or split one person who filed under different spellings.
          </li>
          <li>
            <strong>Amounts are as filed</strong>, including refunds and corrections where present.
          </li>
          <li>
            This site is not legal advice. Verify against the{' '}
            <a href="https://secure.kentucky.gov/kref/publicsearch" rel="noopener">
              KREF originals
            </a>{' '}
            before publication.
          </li>
        </ul>

        <h2>For AI agents &amp; developers</h2>
        <p>
          There is no backend — the open JSON under <code>/data/</code> is the whole machine-readable
          API. It's static, CORS-open, no auth, no key:
        </p>
        <ul>
          <li>
            <a href="/data/elections.json">/data/elections.json</a> — index of all covered elections
            (keys are <code>YYYY-MM-DD</code>).
          </li>
          <li>
            <code>/data/e/&lt;date&gt;/summary.json</code> — KPIs, top candidates/donors/self-funders/
            employers, by-office and monthly rollups.
          </li>
          <li>
            <code>/data/e/&lt;date&gt;/races.json</code>, <code>donors.json</code>,{' '}
            <code>employers.json</code> — full per-election rollups (donors.json is large, up to
            ~6&nbsp;MB).
          </li>
          <li>
            <code>/data/e/&lt;date&gt;/candidates/&lt;slug&gt;.json</code> — full itemized
            contributions for one candidate.
          </li>
        </ul>
        <p>
          Start with <a href="/llms.txt">llms.txt</a> (the full data contract) and{' '}
          <a href="/skill.md">skill.md</a> (a task-oriented guide for AI agents). Donor keys prefixed{' '}
          <code>candidate-self-</code>, <code>unitemized-</code>, <code>anonymous-</code>,{' '}
          <code>cash-unnamed-</code> are synthetic — not named people.
        </p>

        <h2>Who runs this</h2>
        <p>
          KREF Watch is an independent project of{' '}
          <a href="https://lexingtonky.news" rel="noopener">
            The Lexington Times
          </a>{' '}
          and is not affiliated with the Kentucky Registry of Election Finance. Questions, corrections,
          tips: <a href="mailto:editor@lexingtonky.news">editor@lexingtonky.news</a>.
        </p>
      </div>
    </div>
  );
}
