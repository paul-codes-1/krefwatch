import { Link, useParams } from 'react-router-dom';
import { getDonorShardFor } from '../lib/api';
import { useData } from '../hooks/useData';
import { useElectionParam } from '../hooks/useElectionParam';
import {
  electionShortLabel,
  formatCount,
  formatElectionLabel,
  formatMoney,
  formatMoneyExact,
  raceDisplayName,
} from '../lib/format';
import { usePageMeta } from '../hooks/usePageMeta';
import { isSyntheticKey } from '../lib/synthetic';
import Money from '../components/Money';
import SyntheticTag from '../components/SyntheticTag';
import DataTable, { type Column } from '../components/DataTable';
import UnknownElection from '../components/UnknownElection';
import { LoadingNote, ErrorNote } from '../components/Status';
import type { DonorRecipient } from '../lib/types';

export default function DonorDetail() {
  const { date, election } = useElectionParam();
  const { key = '' } = useParams<{ key: string }>();
  const { data: donors, loading, error } = useData(
    () => getDonorShardFor(date, key),
    `donor-shard:${date}:${key}`,
  );

  const found = donors?.find((d) => d.key === key);
  const shortLabel = election ? electionShortLabel(date, election.electionType) : '';
  usePageMeta(
    found ? `${found.name} — political giving, ${shortLabel} | KREF Watch` : 'Donor — KREF Watch',
    found
      ? `${found.name} gave ${formatMoney(found.total)} across ${formatCount(found.count)} contributions to ${formatCount(found.recipients.length)} Kentucky campaigns in the ${shortLabel} election. Per-recipient breakdown on KREF Watch.`
      : undefined,
  );

  if (!election) return <UnknownElection date={date} />;

  if (loading) {
    return (
      <div className="page container">
        <LoadingNote label="Loading donor records…" />
      </div>
    );
  }
  if (error || !donors) {
    return (
      <div className="page container">
        <ErrorNote message={error ?? 'Donor data unavailable.'} />
      </div>
    );
  }

  const base = `/e/${date}`;
  const donor = found ?? null;
  if (!donor) {
    return (
      <div className="page container">
        <p className="kicker">Not found</p>
        <h1 className="page-title">Donor not found</h1>
        <p className="page-sub">
          No donor matches this address in this election.{' '}
          <Link to={`${base}/donors`} style={{ textDecoration: 'underline' }}>
            Search donors →
          </Link>
        </p>
      </div>
    );
  }

  const metaParts = [
    [donor.city, donor.state].filter(Boolean).join(', '),
    donor.employer,
    donor.occupation,
  ].filter(Boolean);

  const columns: Column<DonorRecipient>[] = [
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
    { key: 'race', label: 'Race', render: (r) => raceDisplayName(r.office, r.location) },
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
      <p className="kicker">
        <Link to={`${base}/donors`}>Donors</Link> · {formatElectionLabel(date, election.electionType)}
      </p>
      <h1 className="page-title">
        {donor.name} {isSyntheticKey(donor.key) && <SyntheticTag donorKey={donor.key} />}
      </h1>
      {metaParts.length > 0 && <p className="page-sub">{metaParts.join(' · ')}</p>}

      <div className="kpi-strip">
        <div className="kpi">
          <span className="kpi-label">Total given</span>
          <span className="kpi-value money">{formatMoneyExact(donor.total)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Contributions</span>
          <span className="kpi-value">{formatCount(donor.count)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Recipients</span>
          <span className="kpi-value">{formatCount(donor.recipients.length)}</span>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Recipients</h2>
        </div>
        <DataTable
          caption={`Recipients of ${donor.name}`}
          columns={columns}
          rows={donor.recipients}
          rowKey={(r) => r.slug}
        />
      </section>
    </div>
  );
}
