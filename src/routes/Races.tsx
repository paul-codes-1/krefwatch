import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRaces } from '../lib/api';
import { useData } from '../hooks/useData';
import { useElectionParam } from '../hooks/useElectionParam';
import { useDebounced } from '../hooks/useDebounced';
import useTableSort from '../hooks/useTableSort';
import { compareValues } from '../lib/utils';
import { electionShortLabel, formatCount, formatElectionLabel, raceDisplayName } from '../lib/format';
import { usePageMeta } from '../hooks/usePageMeta';
import Money from '../components/Money';
import DataTable, { type Column } from '../components/DataTable';
import SearchBox from '../components/SearchBox';
import UnknownElection from '../components/UnknownElection';
import { LoadingNote, ErrorNote, EmptyNote } from '../components/Status';
import type { Race } from '../lib/types';

type SortField = 'race' | 'total' | 'count' | 'candidates';

export default function Races() {
  const { date, election } = useElectionParam();
  const { data: races, loading, error } = useData(() => getRaces(date), `races:${date}`);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query);
  const { sortField, sortDirection, handleSort } = useTableSort<SortField>('total');

  const rows = useMemo(() => {
    if (!races) return [];
    const q = debouncedQuery.trim().toLowerCase();
    const filtered = q
      ? races.filter((race) => {
          const haystack = `${race.office} ${race.location} ${race.candidates
            .map((c) => c.name)
            .join(' ')}`.toLowerCase();
          return q.split(/\s+/).every((term) => haystack.includes(term));
        })
      : races;

    const value = (r: Race): string | number => {
      switch (sortField) {
        case 'race':
          return raceDisplayName(r.office, r.location);
        case 'count':
          return r.count;
        case 'candidates':
          return r.candidates.length;
        case 'total':
          return r.total;
      }
    };
    return [...filtered].sort((a, b) => compareValues(value(a), value(b), sortDirection));
  }, [races, debouncedQuery, sortField, sortDirection]);

  const shortLabel = election ? electionShortLabel(date, election.electionType) : '';
  usePageMeta(
    `Races — ${shortLabel} | KREF Watch`,
    `Every Kentucky contest with reported campaign money in the ${shortLabel} election, ranked by total raised. Search by office, county, or candidate on KREF Watch.`,
  );

  if (!election) return <UnknownElection date={date} />;

  const base = `/e/${date}`;

  const columns: Column<Race, SortField>[] = [
    {
      key: 'race',
      label: 'Race',
      sortField: 'race',
      primary: true,
      render: (r) => (
        <Link className="row-link" to={`${base}/races/${r.slug}`}>
          {raceDisplayName(r.office, r.location)}
        </Link>
      ),
    },
    {
      key: 'leader',
      label: 'Leading fundraiser',
      render: (r) => {
        const leader = r.candidates[0];
        if (!leader) return '—';
        return (
          <Link className="row-link" to={`${base}/candidates/${leader.slug}`} style={{ fontWeight: 400 }}>
            {leader.name}
          </Link>
        );
      },
    },
    {
      key: 'candidates',
      label: 'Candidates',
      sortField: 'candidates',
      align: 'right',
      render: (r) => <span className="num">{r.candidates.length}</span>,
    },
    {
      key: 'count',
      label: 'Gifts',
      sortField: 'count',
      align: 'right',
      render: (r) => <span className="num">{formatCount(r.count)}</span>,
    },
    {
      key: 'total',
      label: 'Raised',
      sortField: 'total',
      align: 'right',
      highlight: true,
      render: (r) => <Money value={r.total} />,
    },
  ];

  return (
    <div className="page container">
      <p className="kicker">{formatElectionLabel(date, election.electionType)}</p>
      <h1 className="page-title">Races</h1>
      <p className="page-sub">Every contest with reported money in this election, ranked by total raised.</p>

      <section className="section">
        <div className="toolbar">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Filter by office, county, or candidate…"
            label="Filter races"
          />
          {races && (
            <span className="result-count">
              {formatCount(rows.length)} of {formatCount(races.length)} races
            </span>
          )}
        </div>

        {loading && <LoadingNote label="Loading races…" />}
        {error && <ErrorNote message={error} />}
        {races && rows.length === 0 && <EmptyNote message="No races match that search." />}
        {races && rows.length > 0 && (
          <DataTable
            caption="Races"
            columns={columns}
            rows={rows}
            rowKey={(r) => r.slug}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        )}
      </section>
    </div>
  );
}
