import { Link } from 'react-router-dom';
import { useElections } from '../context/ElectionsContext';

export default function UnknownElection({ date }: { date: string }) {
  const { defaultElection } = useElections();
  return (
    <div className="page container">
      <p className="kicker">Not found</p>
      <h1 className="page-title">No election on “{date}”</h1>
      <p className="page-sub">
        That date isn’t in the KREF Watch index.{' '}
        <Link to={`/e/${defaultElection.date}`} style={{ textDecoration: 'underline' }}>
          Go to the latest election →
        </Link>
      </p>
    </div>
  );
}
