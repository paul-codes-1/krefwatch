import type { ChangeEvent } from 'react';
import { Link, NavLink, Outlet, matchPath, useLocation, useNavigate } from 'react-router-dom';
import { useElections } from '../context/ElectionsContext';
import { formatElectionLabel, formatLongDate } from '../lib/format';

/**
 * Where to land when switching elections, preserving the current view type.
 * Detail pages for candidates/donors fall back to the overview; race and
 * employer detail pages fall back to their list view.
 */
function switchTarget(pathname: string, newDate: string): string {
  const match = matchPath('/e/:date/*', pathname);
  const rest = match?.params['*'] ?? '';
  const [section, ...deeper] = rest.split('/').filter(Boolean);
  if (section === 'races') return `/e/${newDate}/races`;
  if (section === 'donors') return deeper.length ? `/e/${newDate}` : `/e/${newDate}/donors`;
  if (section === 'employers') return `/e/${newDate}/employers`;
  return `/e/${newDate}`;
}

export default function Layout() {
  const { index, elections, defaultElection } = useElections();
  const location = useLocation();
  const navigate = useNavigate();

  const match = matchPath('/e/:date/*', location.pathname) ?? matchPath('/e/:date', location.pathname);
  const urlDate = match?.params.date;
  const currentDate = urlDate && elections.some((e) => e.date === urlDate) ? urlDate : defaultElection.date;

  const onSwitch = (event: ChangeEvent<HTMLSelectElement>) => {
    navigate(switchTarget(location.pathname, event.target.value));
  };

  return (
    <>
      <header>
        <div className="masthead container">
          <div>
            <Link to="/" className="wordmark" aria-label="KREF Watch home">
              <span className="wordmark-block">KREF</span>
              <span className="wordmark-rest">Watch</span>
            </Link>
            <span className="tagline">Who funds Kentucky politics</span>
          </div>
          <div className="masthead-right">
            <label className="switcher-label" htmlFor="election-switcher">
              Election
            </label>
            <select
              id="election-switcher"
              className="election-switcher"
              value={currentDate}
              onChange={onSwitch}
            >
              {elections.map((e) => (
                <option key={e.date} value={e.date}>
                  {formatElectionLabel(e.date, e.electionType)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="site-nav-wrap">
          <nav className="site-nav container" aria-label="Primary">
            {/* "/" renders the default election's overview directly, so the
                Overview tab is also active on the homepage. */}
            <NavLink
              to={`/e/${currentDate}`}
              end
              className={({ isActive }) =>
                isActive || location.pathname === '/' ? 'active' : ''
              }
            >
              Overview
            </NavLink>
            <NavLink to={`/e/${currentDate}/races`} className={({ isActive }) => (isActive ? 'active' : '')}>
              Races
            </NavLink>
            <NavLink to={`/e/${currentDate}/donors`} className={({ isActive }) => (isActive ? 'active' : '')}>
              Donors
            </NavLink>
            <NavLink to={`/e/${currentDate}/employers`} className={({ isActive }) => (isActive ? 'active' : '')}>
              Employers
            </NavLink>
            <NavLink to="/about" className={({ isActive }) => (isActive ? 'active' : '')}>
              About
            </NavLink>
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>
            Data: Kentucky Registry of Election Finance public records. KREF Watch is an independent
            project of <a href="https://lexingtonky.news">The Lexington Times</a> and is not affiliated
            with the Registry. Data refreshed periodically; filings may lag.
          </p>
          <p className="footer-meta">
            Data generated {formatLongDate(index.generatedAt.slice(0, 10))} ·{' '}
            <Link to="/about">Methodology &amp; caveats</Link> · Lobbying:{' '}
            <a href="https://klecwatch.com" rel="noopener">
              KLEC Watch — who lobbies Frankfort
            </a>
          </p>
          <p className="footer-meta">
            For AI agents: <a href="/llms.txt">llms.txt</a> · <a href="/skill.md">skill.md</a> ·{' '}
            <a href="/data/elections.json">JSON data</a> ·{' '}
            <a href="https://github.com/paul-codes-1/krefwatch" rel="noopener">
              Open source on GitHub
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
