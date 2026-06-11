import { Link, useParams } from 'react-router-dom';
import { getRaces } from '../lib/api';
import { useData } from '../hooks/useData';
import { useElectionParam } from '../hooks/useElectionParam';
import { electionShortLabel, formatCount, formatElectionLabel, formatMoney, raceDisplayName } from '../lib/format';
import { usePageMeta } from '../hooks/usePageMeta';
import Money from '../components/Money';
import ShareBar from '../components/ShareBar';
import DataTable, { type Column } from '../components/DataTable';
import UnknownElection from '../components/UnknownElection';
import { LoadingNote, ErrorNote } from '../components/Status';
import type { RaceCandidate } from '../lib/types';

export default function RaceDetail() {
  const { date, election } = useElectionParam();
  const { raceSlug = '' } = useParams<{ raceSlug: string }>();
  const { data: races, loading, error } = useData(() => getRaces(date), `races:${date}`);

  const race = races?.find((r) => r.slug === raceSlug);
  const shortLabel = election ? electionShortLabel(date, election.electionType) : '';
  usePageMeta(
    race
      ? `${raceDisplayName(race.office, race.location)} race money, ${shortLabel} | KREF Watch`
      : 'Race — KREF Watch',
    race
      ? `${formatMoney(race.total)} raised by ${formatCount(race.candidates.length)} candidates in the ${raceDisplayName(race.office, race.location)} race, ${shortLabel} election, Kentucky. Per-candidate fundraising on KREF Watch.`
      : undefined,
  );

  if (!election) return <UnknownElection date={date} />;

  if (loading) {
    return (
      <div className="page container">
        <LoadingNote label="Loading race…" />
      </div>
    );
  }
  if (error || !races) {
    return (
      <div className="page container">
        <ErrorNote message={error ?? 'Race data unavailable.'} />
      </div>
    );
  }

  const base = `/e/${date}`;
  if (!race) {
    return (
      <div className="page container">
        <p className="kicker">Not found</p>
        <h1 className="page-title">Race not found</h1>
        <p className="page-sub">
          No race matches this address in this election.{' '}
          <Link to={`${base}/races`} style={{ textDecoration: 'underline' }}>
            Browse all races →
          </Link>
        </p>
      </div>
    );
  }

  const columns: Column<RaceCandidate>[] = [
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
      key: 'share',
      label: 'Share of race money',
      hideOnMobile: true,
      render: (r) => <ShareBar value={r.total} max={race.total} />,
    },
    {
      key: 'count',
      label: 'Gifts',
      align: 'right',
      render: (r) => <span className="num">{formatCount(r.count)}</span>,
    },
    { key: 'total', label: 'Raised', align: 'right', highlight: true, render: (r) => <Money value={r.total} /> },
  ];

  return (
    <div className="page container">
      <p className="kicker">
        <Link to={`${base}/races`}>Races</Link> · {formatElectionLabel(date, election.electionType)}
      </p>
      <h1 className="page-title">{raceDisplayName(race.office, race.location)}</h1>

      <div className="kpi-strip">
        <div className="kpi">
          <span className="kpi-label">Total raised</span>
          <span className="kpi-value money">
            <Money value={race.total} />
          </span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Contributions</span>
          <span className="kpi-value">{formatCount(race.count)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Candidates</span>
          <span className="kpi-value">{formatCount(race.candidates.length)}</span>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Candidates by money raised</h2>
        </div>
        <DataTable
          caption={`Candidates in ${raceDisplayName(race.office, race.location)}`}
          columns={columns}
          rows={race.candidates}
          rowKey={(r) => r.slug}
        />
      </section>
    </div>
  );
}
