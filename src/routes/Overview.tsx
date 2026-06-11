import { Link } from 'react-router-dom';
import { getSummary } from '../lib/api';
import { useData } from '../hooks/useData';
import { useElectionParam } from '../hooks/useElectionParam';
import {
  electionShortLabel,
  formatCount,
  formatContributionType,
  formatElectionLabel,
  formatElectionType,
  formatLongDate,
  formatMoney,
  raceDisplayName,
} from '../lib/format';
import { usePageMeta } from '../hooks/usePageMeta';
import { slugify } from '../lib/utils';
import Money from '../components/Money';
import DataTable, { type Column } from '../components/DataTable';
import MonthlyChart from '../components/MonthlyChart';
import ShareBar from '../components/ShareBar';
import UnknownElection from '../components/UnknownElection';
import { LoadingNote, ErrorNote } from '../components/Status';
import type {
  OfficeTotal,
  ContributionTypeTotal,
  TopCandidate,
  TopDonor,
  TopSelfFunder,
  EmployerRollup,
} from '../lib/types';

const plural = (n: number, noun: string): string => (n === 1 ? noun : `${noun}s`);

export default function Overview() {
  const { date, election } = useElectionParam();
  const { data: summary, loading, error } = useData(() => getSummary(date), `summary:${date}`);

  usePageMeta(
    election
      ? `Kentucky Campaign Finance — ${electionShortLabel(date, election.electionType)} | KREF Watch`
      : 'KREF Watch — Who funds Kentucky politics',
    summary
      ? `${formatMoney(summary.totalAmount)} raised by ${formatCount(summary.candidateCount)} candidates across ${formatCount(summary.raceCount)} races in Kentucky's ${formatLongDate(date)} ${formatElectionType(summary.electionType).toLowerCase()} election. Browse races, donors, and employers on KREF Watch.`
      : undefined,
  );

  if (!election) return <UnknownElection date={date} />;

  if (loading) {
    return (
      <div className="page container">
        <LoadingNote label="Loading election overview…" />
      </div>
    );
  }
  if (error || !summary) {
    return (
      <div className="page container">
        <ErrorNote message={error ?? 'No summary available.'} />
      </div>
    );
  }

  const base = `/e/${date}`;

  const candidateCols: Column<TopCandidate>[] = [
    { key: 'rank', label: '#', render: (_r, i) => <span className="rank">{i + 1}</span>, hideOnMobile: true },
    {
      key: 'name',
      label: 'Candidate',
      primary: true,
      render: (r) => (
        <Link className="row-link" to={`${base}/candidates/${r.slug}`}>
          {r.name}
        </Link>
      ),
    },
    {
      key: 'race',
      label: 'Race',
      render: (r) => (
        <Link className="row-link" to={`${base}/races/${slugify(`${r.office} ${r.location}`)}`} style={{ fontWeight: 400 }}>
          {raceDisplayName(r.office, r.location)}
        </Link>
      ),
    },
    { key: 'total', label: 'Raised', align: 'right', highlight: true, render: (r) => <Money value={r.total} /> },
    {
      key: 'count',
      label: 'Gifts',
      align: 'right',
      render: (r) => <span className="num">{formatCount(r.count)}</span>,
    },
  ];

  const donorCols: Column<TopDonor>[] = [
    { key: 'rank', label: '#', render: (_r, i) => <span className="rank">{i + 1}</span>, hideOnMobile: true },
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
    { key: 'employer', label: 'Employer', render: (r) => r.employer || '—' },
    { key: 'total', label: 'Given', align: 'right', highlight: true, render: (r) => <Money value={r.total} /> },
    {
      key: 'recipients',
      label: 'Recipients',
      align: 'right',
      render: (r) => <span className="num">{formatCount(r.recipientCount)}</span>,
    },
  ];

  const selfFunderCols: Column<TopSelfFunder>[] = [
    { key: 'rank', label: '#', render: (_r, i) => <span className="rank">{i + 1}</span>, hideOnMobile: true },
    {
      key: 'name',
      label: 'Candidate',
      primary: true,
      render: (r) => (
        <Link className="row-link" to={`${base}/candidates/${r.candidateSlug}`}>
          {r.name}
        </Link>
      ),
    },
    {
      key: 'race',
      label: 'Race',
      render: (r) => raceDisplayName(r.office, r.location),
    },
    {
      key: 'count',
      label: 'Gifts',
      align: 'right',
      render: (r) => <span className="num">{formatCount(r.count)}</span>,
    },
    {
      key: 'total',
      label: 'Self-funded',
      align: 'right',
      highlight: true,
      render: (r) => <Money value={r.total} />,
    },
  ];

  const employerCols: Column<EmployerRollup>[] = [
    { key: 'rank', label: '#', render: (_r, i) => <span className="rank">{i + 1}</span>, hideOnMobile: true },
    {
      key: 'name',
      label: 'Employer',
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
      align: 'right',
      render: (r) => <span className="num">{formatCount(r.donorCount)}</span>,
    },
    {
      key: 'count',
      label: 'Gifts',
      align: 'right',
      render: (r) => <span className="num">{formatCount(r.count)}</span>,
    },
    { key: 'total', label: 'Given', align: 'right', highlight: true, render: (r) => <Money value={r.total} /> },
  ];

  const maxOffice = summary.byOffice[0]?.total ?? 0;
  const officeCols: Column<OfficeTotal>[] = [
    { key: 'office', label: 'Office', primary: true, render: (r) => r.office },
    {
      key: 'share',
      label: 'Share',
      hideOnMobile: true,
      render: (r) => <ShareBar value={r.total} max={maxOffice} />,
    },
    { key: 'total', label: 'Raised', align: 'right', highlight: true, render: (r) => <Money value={r.total} /> },
  ];

  const typeCols: Column<ContributionTypeTotal>[] = [
    { key: 'type', label: 'Type', primary: true, render: (r) => formatContributionType(r.type) },
    { key: 'total', label: 'Total', align: 'right', highlight: true, render: (r) => <Money value={r.total} /> },
  ];

  return (
    <div className="page container">
      <p className="kicker">{formatElectionType(summary.electionType)} election · Kentucky</p>
      <h1 className="page-title">{formatLongDate(date)}</h1>
      <p className="page-sub">
        <span className="money">{formatMoney(summary.totalAmount)}</span> reported across{' '}
        {formatCount(summary.contributionCount)} {plural(summary.contributionCount, 'contribution')} to{' '}
        {formatCount(summary.candidateCount)} {plural(summary.candidateCount, 'candidate')} in{' '}
        {formatCount(summary.raceCount)} {plural(summary.raceCount, 'race')}.
      </p>

      <div className="kpi-strip">
        <div className="kpi">
          <span className="kpi-label">Total raised</span>
          <span className="kpi-value money">{formatMoney(summary.totalAmount)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Contributions</span>
          <span className="kpi-value">{formatCount(summary.contributionCount)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Candidates</span>
          <span className="kpi-value">{formatCount(summary.candidateCount)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Races</span>
          <span className="kpi-value">{formatCount(summary.raceCount)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Named donors</span>
          <span className="kpi-value">{formatCount(summary.namedDonorCount)}</span>
          <span className="kpi-sub">of {formatCount(summary.donorCount)} donor records</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Candidate self-funding</span>
          <span className="kpi-value money">{formatMoney(summary.selfFundingTotal)}</span>
          <span className="kpi-sub">candidates funding their own campaigns</span>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Money over time</h2>
        </div>
        <MonthlyChart monthly={summary.monthly} />
        <p className="section-note">Reported contributions by receipt month, all candidates in this election.</p>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Top candidates</h2>
          <Link className="section-link" to={`${base}/races`}>
            All races →
          </Link>
        </div>
        <DataTable
          caption={`Top candidates, ${formatElectionLabel(date, summary.electionType)}`}
          columns={candidateCols}
          rows={summary.topCandidates}
          rowKey={(r) => r.slug}
        />
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Top donors</h2>
          <Link className="section-link" to={`${base}/donors`}>
            Search donors →
          </Link>
        </div>
        <DataTable
          caption="Top donors"
          columns={donorCols}
          rows={summary.topDonors}
          rowKey={(r) => r.key}
        />
        <p className="section-note">
          Named donors only — excludes candidate self-funding and small-dollar bundles.
        </p>
      </section>

      {summary.topSelfFunders.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Top self-funders</h2>
          </div>
          <DataTable
            caption="Top self-funding candidates"
            columns={selfFunderCols}
            rows={summary.topSelfFunders}
            rowKey={(r) => r.candidateSlug}
          />
          <p className="section-note">
            Candidates putting their own money in — {formatMoney(summary.selfFundingTotal)} in total.
            Unitemized small-dollar contributions add {formatMoney(summary.unitemizedTotal)}.
          </p>
        </section>
      )}

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Top employers</h2>
          <Link className="section-link" to={`${base}/employers`}>
            All employers →
          </Link>
        </div>
        <DataTable
          caption="Top employers"
          columns={employerCols}
          rows={summary.topEmployers}
          rowKey={(r) => r.key}
        />
        <p className="section-note">
          Grouped by donor-reported employer; spellings normalized in the data pipeline. Retired,
          unemployed, and junk values excluded.
        </p>
      </section>

      <div className="split-2">
        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Money by office</h2>
          </div>
          <DataTable
            caption="Money by office"
            columns={officeCols}
            rows={summary.byOffice}
            rowKey={(r) => r.office}
          />
        </section>

        <section className="section">
          <div className="section-head">
            <h2 className="section-title">By contribution type</h2>
          </div>
          <DataTable
            caption="Money by contribution type"
            columns={typeCols}
            rows={summary.byContributionType}
            rowKey={(r) => r.type}
          />
        </section>
      </div>
    </div>
  );
}
