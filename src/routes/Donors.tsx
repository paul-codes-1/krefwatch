import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDonorsLite } from '../lib/api';
import { useData } from '../hooks/useData';
import { useElectionParam } from '../hooks/useElectionParam';
import { useDebounced } from '../hooks/useDebounced';
import { filterDonors, EMPTY_QUERY_LIMIT, RESULT_LIMIT } from '../lib/donorSearch';
import { electionShortLabel, formatCount, formatElectionLabel } from '../lib/format';
import { usePageMeta } from '../hooks/usePageMeta';
import { isSyntheticKey } from '../lib/synthetic';
import Money from '../components/Money';
import SyntheticTag from '../components/SyntheticTag';
import DataTable, { type Column } from '../components/DataTable';
import SearchBox from '../components/SearchBox';
import UnknownElection from '../components/UnknownElection';
import { LoadingNote, ErrorNote, EmptyNote } from '../components/Status';
import type { DonorLite } from '../lib/types';

export default function Donors() {
  const { date, election } = useElectionParam();
  const { data: donors, loading, error } = useData(() => getDonorsLite(date), `donors-lite:${date}`);
  const [query, setQuery] = useState('');
  const [includeSynthetic, setIncludeSynthetic] = useState(false);
  const debouncedQuery = useDebounced(query);

  const results = useMemo(
    () => (donors ? filterDonors(donors, debouncedQuery, includeSynthetic) : []),
    [donors, debouncedQuery, includeSynthetic],
  );

  const shortLabel = election ? electionShortLabel(date, election.electionType) : '';
  usePageMeta(
    `Donor search — ${shortLabel} | KREF Watch`,
    `Search every campaign donor in Kentucky's ${shortLabel} election by name, city, employer, or occupation on KREF Watch.`,
  );

  if (!election) return <UnknownElection date={date} />;

  const base = `/e/${date}`;
  const hasQuery = debouncedQuery.trim().length > 0;

  const columns: Column<DonorLite>[] = [
    {
      key: 'name',
      label: 'Donor',
      primary: true,
      render: (r) =>
        isSyntheticKey(r.key) ? (
          <>
            {r.name} <SyntheticTag donorKey={r.key} />
          </>
        ) : (
          <Link className="row-link" to={`${base}/donors/${r.key}`}>
            {r.name}
          </Link>
        ),
    },
    {
      key: 'place',
      label: 'From',
      render: (r) => [r.city, r.state].filter(Boolean).join(', ') || '—',
    },
    { key: 'employer', label: 'Employer', render: (r) => r.employer || '—' },
    { key: 'occupation', label: 'Occupation', hideOnMobile: true, render: (r) => r.occupation || '—' },
    {
      key: 'recipients',
      label: 'Recipients',
      align: 'right',
      render: (r) => <span className="num">{formatCount(r.recipientCount)}</span>,
    },
    {
      key: 'count',
      label: 'Gifts',
      align: 'right',
      render: (r) => <span className="num">{formatCount(r.count)}</span>,
    },
    { key: 'total', label: 'Given', align: 'right', highlight: true, render: (r) => <Money value={r.total} /> },
  ];

  return (
    <div className="page container">
      <p className="kicker">{formatElectionLabel(date, election.electionType)}</p>
      <h1 className="page-title">Donors</h1>
      <p className="page-sub">
        Search every donor identity in this election by name, city, employer, or occupation. Donors are
        grouped by reported name, so a common name can merge distinct people — verify before publishing.
      </p>

      <section className="section">
        {loading && <LoadingNote label="Loading donor records…" />}
        {error && <ErrorNote message={error} />}
        {donors && (
          <>
            <div className="toolbar">
              <SearchBox
                value={query}
                onChange={setQuery}
                placeholder="Name, city, employer, occupation…"
                label="Search donors"
              />
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeSynthetic}
                  onChange={(e) => setIncludeSynthetic(e.target.checked)}
                />
                Include self-funding &amp; unitemized bundles
              </label>
              <span className="result-count">
                {hasQuery
                  ? `${formatCount(results.length)}${results.length >= RESULT_LIMIT ? '+' : ''} of ${formatCount(donors.length)} donors`
                  : `Top ${Math.min(EMPTY_QUERY_LIMIT, donors.length)} of ${formatCount(donors.length)} donors by total${includeSynthetic ? '' : ' — named donors only'}`}
              </span>
            </div>

            {results.length === 0 ? (
              <EmptyNote message="No donors match that search." />
            ) : (
              <DataTable caption="Donors" columns={columns} rows={results} rowKey={(r) => r.key} />
            )}
            {hasQuery && results.length >= RESULT_LIMIT && (
              <p className="section-note">
                Showing the first {RESULT_LIMIT} matches by total given — narrow the search to see the rest.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
