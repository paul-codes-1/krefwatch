import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCandidate } from '../lib/api';
import { useData } from '../hooks/useData';
import { useElectionParam } from '../hooks/useElectionParam';
import { useDebounced } from '../hooks/useDebounced';
import useTableSort from '../hooks/useTableSort';
import { compareValues, parseReceiptDate, slugify } from '../lib/utils';
import {
  electionShortLabel,
  formatCount,
  formatContributionType,
  formatElectionLabel,
  formatMode,
  formatMoney,
  formatMoneyExact,
  raceDisplayName,
} from '../lib/format';
import { usePageMeta } from '../hooks/usePageMeta';
import { isSyntheticKey } from '../lib/synthetic';
import Money from '../components/Money';
import SyntheticTag from '../components/SyntheticTag';
import DataTable, { type Column } from '../components/DataTable';
import SearchBox from '../components/SearchBox';
import Pagination from '../components/Pagination';
import UnknownElection from '../components/UnknownElection';
import { LoadingNote, ErrorNote, EmptyNote } from '../components/Status';
import type { Contribution } from '../lib/types';

const PAGE_SIZE = 50;

type SortField = 'amount' | 'date' | 'name';

export default function CandidatePage() {
  const { date, election } = useElectionParam();
  const { slug = '' } = useParams<{ slug: string }>();
  const {
    data: candidate,
    loading,
    error,
  } = useData(() => getCandidate(date, slug), `candidate:${date}/${slug}`);

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query);
  const { sortField, sortDirection, handleSort } = useTableSort<SortField>('amount');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, sortField, sortDirection, slug, date]);

  const shortLabel = election ? electionShortLabel(date, election.electionType) : '';
  usePageMeta(
    candidate
      ? `${candidate.name} — campaign contributions, ${shortLabel} | KREF Watch`
      : 'Candidate — KREF Watch',
    candidate
      ? `${candidate.name} raised ${formatMoney(candidate.total)} from ${formatCount(candidate.count)} contributions for ${raceDisplayName(candidate.office, candidate.location)} in Kentucky's ${shortLabel} election. Full itemized donor list on KREF Watch.`
      : undefined,
  );

  const filtered = useMemo(() => {
    if (!candidate) return [];
    const q = debouncedQuery.trim().toLowerCase();
    const rows = q
      ? candidate.contributions.filter((row) => {
          const haystack = `${row.n} ${row.c} ${row.s} ${row.e} ${row.o}`.toLowerCase();
          return q.split(/\s+/).every((term) => haystack.includes(term));
        })
      : candidate.contributions;

    const value = (r: Contribution): string | number => {
      switch (sortField) {
        case 'amount':
          return r.a;
        case 'date':
          return parseReceiptDate(r.r);
        case 'name':
          return r.n;
      }
    };
    return [...rows].sort((a, b) => compareValues(value(a), value(b), sortDirection));
  }, [candidate, debouncedQuery, sortField, sortDirection]);

  if (!election) return <UnknownElection date={date} />;

  if (loading) {
    return (
      <div className="page container">
        <LoadingNote label="Loading candidate filings…" />
      </div>
    );
  }
  if (error || !candidate) {
    return (
      <div className="page container">
        <ErrorNote message={error ?? 'Candidate not found in this election.'} />
      </div>
    );
  }

  const base = `/e/${date}`;
  const raceSlug = slugify(`${candidate.office} ${candidate.location}`);
  const largest = candidate.contributions.reduce((max, c) => Math.max(max, c.a), 0);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const columns: Column<Contribution, SortField>[] = [
    {
      key: 'name',
      label: 'Contributor',
      sortField: 'name',
      primary: true,
      render: (r) => (
        <>
          {isSyntheticKey(r.d) ? (
            <>
              {r.n} <SyntheticTag donorKey={r.d} />
            </>
          ) : (
            <Link className="row-link" to={`${base}/donors/${r.d}`}>
              {r.n}
            </Link>
          )}
          {r.k && <span className="inkind-note">In-kind: {r.k}</span>}
        </>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (r) => (
        <>
          {formatContributionType(r.t)}
          {r.m !== 'DIRECT' && <span className="cell-sub">{formatMode(r.m)}</span>}
        </>
      ),
    },
    {
      key: 'place',
      label: 'From',
      hideOnMobile: true,
      render: (r) => [r.c, r.s].filter(Boolean).join(', ') || '—',
    },
    {
      key: 'employer',
      label: 'Employer / Occupation',
      hideOnMobile: true,
      render: (r) => {
        const employer = r.e || '';
        const occupation = r.o || '';
        if (!employer && !occupation) return '—';
        return (
          <>
            {employer || '—'}
            {occupation && occupation.toLowerCase() !== employer.toLowerCase() && (
              <span className="cell-sub">{occupation}</span>
            )}
          </>
        );
      },
    },
    {
      key: 'date',
      label: 'Date',
      sortField: 'date',
      align: 'right',
      render: (r) => <span className="num">{r.r || '—'}</span>,
    },
    {
      key: 'amount',
      label: 'Amount',
      sortField: 'amount',
      align: 'right',
      highlight: true,
      render: (r) => <Money value={r.a} />,
    },
  ];

  return (
    <div className="page container">
      <p className="kicker">
        <Link to={`${base}/races/${raceSlug}`}>{raceDisplayName(candidate.office, candidate.location)}</Link> ·{' '}
        {formatElectionLabel(date, election.electionType)}
      </p>
      <h1 className="page-title">{candidate.name}</h1>

      <div className="kpi-strip">
        <div className="kpi">
          <span className="kpi-label">Total raised</span>
          <span className="kpi-value money">{formatMoneyExact(candidate.total)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Contributions</span>
          <span className="kpi-value">{formatCount(candidate.count)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Largest single gift</span>
          <span className="kpi-value money">{formatMoneyExact(largest)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Average gift</span>
          <span className="kpi-value money">
            {formatMoneyExact(candidate.count > 0 ? candidate.total / candidate.count : 0)}
          </span>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Itemized contributions</h2>
        </div>
        <div className="toolbar">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Filter by name, city, employer…"
            label="Filter contributions"
          />
          <span className="result-count">
            {formatCount(filtered.length)} of {formatCount(candidate.contributions.length)} contributions
          </span>
        </div>

        {filtered.length === 0 ? (
          <EmptyNote message="No contributions match that search." />
        ) : (
          <>
            <DataTable
              caption={`Contributions to ${candidate.name}`}
              columns={columns}
              rows={pageRows}
              rowKey={(r, i) => `${r.d}-${r.r}-${r.a}-${i}`}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <Pagination page={safePage} pageCount={pageCount} onPage={setPage} />
          </>
        )}
      </section>
    </div>
  );
}
