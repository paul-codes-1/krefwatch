import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEmployers } from '../lib/api';
import { useData } from '../hooks/useData';
import { useElectionParam } from '../hooks/useElectionParam';
import { useDebounced } from '../hooks/useDebounced';
import useTableSort from '../hooks/useTableSort';
import { compareValues, slugify } from '../lib/utils';
import { electionShortLabel, formatCount, formatElectionLabel } from '../lib/format';
import { usePageMeta } from '../hooks/usePageMeta';
import Money from '../components/Money';
import DataTable, { type Column } from '../components/DataTable';
import SearchBox from '../components/SearchBox';
import UnknownElection from '../components/UnknownElection';
import { LoadingNote, ErrorNote, EmptyNote } from '../components/Status';
import type { EmployerRollup } from '../lib/types';

const DISPLAY_LIMIT = 200;

type SortField = 'name' | 'donors' | 'count' | 'total';

export default function Employers() {
  const { date, election } = useElectionParam();
  const { data: employers, loading, error } = useData(() => getEmployers(date), `employers:${date}`);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query);
  const { sortField, sortDirection, handleSort } = useTableSort<SortField>('total');

  const rows = useMemo(() => {
    if (!employers) return [];
    const q = debouncedQuery.trim().toLowerCase();
    const filtered = q
      ? employers.filter((e) =>
          q.split(/\s+/).every((term) => e.key.includes(term) || e.name.toLowerCase().includes(term)),
        )
      : employers;

    const value = (e: EmployerRollup): string | number => {
      switch (sortField) {
        case 'name':
          return e.name;
        case 'donors':
          return e.donorCount;
        case 'count':
          return e.count;
        case 'total':
          return e.total;
      }
    };
    return [...filtered].sort((a, b) => compareValues(value(a), value(b), sortDirection)).slice(0, DISPLAY_LIMIT);
  }, [employers, debouncedQuery, sortField, sortDirection]);

  const shortLabel = election ? electionShortLabel(date, election.electionType) : '';
  usePageMeta(
    `Employers — ${shortLabel} | KREF Watch`,
    `Kentucky campaign donors grouped by reported employer for the ${shortLabel} election — who's giving from each company, agency, and firm. KREF Watch.`,
  );

  if (!election) return <UnknownElection date={date} />;

  const base = `/e/${date}`;

  const columns: Column<EmployerRollup, SortField>[] = [
    {
      key: 'name',
      label: 'Employer',
      sortField: 'name',
      primary: true,
      render: (r) => (
        <Link className="row-link" to={`${base}/employers/${slugify(r.key)}`}>
          {r.name}
        </Link>
      ),
    },
    {
      key: 'donors',
      label: 'Donors',
      sortField: 'donors',
      align: 'right',
      render: (r) => <span className="num">{formatCount(r.donorCount)}</span>,
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
      label: 'Given',
      sortField: 'total',
      align: 'right',
      highlight: true,
      render: (r) => <Money value={r.total} />,
    },
  ];

  return (
    <div className="page container">
      <p className="kicker">{formatElectionLabel(date, election.electionType)}</p>
      <h1 className="page-title">Employers</h1>
      <p className="page-sub">
        Donors grouped by their reported employer, normalized by the data pipeline (canonical aliases,
        law-firm suffixes; retired/unemployed/junk values excluded). Employer fields are self-reported
        and full of filer typos.
      </p>

      <section className="section">
        {loading && <LoadingNote label="Loading employer rollup…" />}
        {error && <ErrorNote message={error} />}
        {employers && (
          <>
            <div className="toolbar">
              <SearchBox
                value={query}
                onChange={setQuery}
                placeholder="Search employers…"
                label="Search employers"
              />
              <span className="result-count">
                {formatCount(rows.length)}
                {rows.length >= DISPLAY_LIMIT ? '+' : ''} of {formatCount(employers.length)} employers
              </span>
            </div>

            {rows.length === 0 ? (
              <EmptyNote message="No employers match that search." />
            ) : (
              <DataTable
                caption="Employers"
                columns={columns}
                rows={rows}
                rowKey={(r) => r.key}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            )}
            {rows.length >= DISPLAY_LIMIT && (
              <p className="section-note">
                Showing the first {DISPLAY_LIMIT} — narrow the search to see the rest.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
