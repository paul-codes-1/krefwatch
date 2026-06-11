import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';

export default function NotFound() {
  usePageMeta('Page not found | KREF Watch');
  return (
    <div className="page container">
      <p className="kicker">404</p>
      <h1 className="page-title">Page not found</h1>
      <p className="page-sub">
        Nothing lives at this address.{' '}
        <Link to="/" style={{ textDecoration: 'underline' }}>
          Go to the latest election →
        </Link>
      </p>
    </div>
  );
}
