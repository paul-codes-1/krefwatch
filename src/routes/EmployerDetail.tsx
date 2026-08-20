import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getDonorsLite, getEmployers, getKlecLinks } from '../lib/api';
import { useData } from '../hooks/useData';
import { useElectionParam } from '../hooks/useElectionParam';
import { slugify } from '../lib/utils';
import { electionShortLabel, formatCount, formatElectionLabel, formatMoney, formatMoneyExact } from '../lib/format';
import { usePageMeta } from '../hooks/usePageMeta';
import Money from '../components/Money';
import DataTable, { type Column } from '../components/DataTable';
import UnknownElection from '../components/UnknownElection';
import { LoadingNote, ErrorNote } from '../components/Status';
import type { DonorLite } from '../lib/types';

export default function EmployerDetail() {
  const { date, election } = useElectionParam();
  const { employerSlug = '' } = useParams<{ employerSlug: string }>();
  const employersState = useData(() => getEmployers(date), `employers:${date}`);
  const donorsState = useData(() => getDonorsLite(date), `donors-lite:${date}`);
  const klecLinksState = useData(() => getKlecLinks(), 'klec-links');

  const employer = useMemo(
    () => employersState.data?.find((e) => slugify(e.key) === employerSlug) ?? null,
    [employersState.data, employerSlug],
  );

  // Exact pipeline-key match — no client-side re-normalization (the pipeline is
  // the single source of truth). donors.json is pre-sorted by total desc, so the
  // filtered list keeps that order.
  const members = useMemo(
    () => (employer && donorsState.data ? donorsState.data.filter((d) => d.employerKey === employer.key) : []),
    [employer, donorsState.data],
  );

  const shortLabel = election ? electionShortLabel(date, election.electionType) : '';
  usePageMeta(
    employer
      ? `${employer.name} — donor giving by employer, ${shortLabel} | KREF Watch`
      : 'Employer — KREF Watch',
    employer
      ? `${formatCount(employer.donorCount)} donors reporting ${employer.name} as employer gave ${formatMoney(employer.total)} in Kentucky's ${shortLabel} election. Donor list on KREF Watch.`
      : undefined,
  );

  if (!election) return <UnknownElection date={date} />;

  if (employersState.loading) {
    return (
      <div className="page container">
        <LoadingNote label="Loading employer rollup…" />
      </div>
    );
  }
  if (employersState.error || !employersState.data) {
    return (
      <div className="page container">
        <ErrorNote message={employersState.error ?? 'Employer data unavailable.'} />
      </div>
    );
  }

  const base = `/e/${date}`;
  if (!employer) {
    return (
      <div className="page container">
        <p className="kicker">Not found</p>
        <h1 className="page-title">Employer not found</h1>
        <p className="page-sub">
          No employer matches this address in this election.{' '}
          <Link to={`${base}/employers`} style={{ textDecoration: 'underline' }}>
            Browse employers →
          </Link>
        </p>
      </div>
    );
  }

  const columns: Column<DonorLite>[] = [
    {
      key: 'name',
      label: 'Donor',
      primary: true,
      render: (r) => (
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
    { key: 'occupation', label: 'Occupation', render: (r) => r.occupation || '—' },
    {
      key: 'recipients',
      label: 'Recipients',
      align: 'right',
      render: (r) => <span className="num">{formatCount(r.recipientCount)}</span>,
    },
    { key: 'total', label: 'Given', align: 'right', highlight: true, render: (r) => <Money value={r.total} /> },
  ];

  return (
    <div className="page container">
      <p className="kicker">
        <Link to={`${base}/employers`}>Employers</Link> · {formatElectionLabel(date, election.electionType)}
      </p>
      <h1 className="page-title">{employer.name}</h1>
      <p className="page-sub">
        Donors who reported this employer (spellings normalized by the data pipeline). Self-reported;
        verify against KREF originals before publication.
      </p>

      <div className="kpi-strip">
        <div className="kpi">
          <span className="kpi-label">Total given</span>
          <span className="kpi-value money">{formatMoneyExact(employer.total)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Donors</span>
          <span className="kpi-value">{formatCount(employer.donorCount)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Contributions</span>
          <span className="kpi-value">{formatCount(employer.count)}</span>
        </div>
      </div>

      {klecLinksState.data?.[employer.key] && (
        <aside className="cross-site-card">
          <span className="cross-site-kicker">Frankfort lobbying</span>
          <p>
            {employer.name} also lobbies the Kentucky General Assembly —{' '}
            {formatMoney(klecLinksState.data[employer.key]!.total)} in reported lobbying spending in{' '}
            {klecLinksState.data[employer.key]!.year}.{' '}
            <a
              href={`https://klecwatch.com/y/${klecLinksState.data[employer.key]!.year}/employers/${slugify(employer.key)}`}
              rel="noopener"
            >
              See its lobbying record on KLEC Watch →
            </a>
          </p>
        </aside>
      )}

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Donors</h2>
        </div>
        {donorsState.loading && <LoadingNote label="Loading donor records…" />}
        {donorsState.error && <ErrorNote message={donorsState.error} />}
        {donorsState.data && (
          <DataTable
            caption={`Donors employed by ${employer.name}`}
            columns={columns}
            rows={members}
            rowKey={(r) => r.key}
          />
        )}
      </section>
    </div>
  );
}
