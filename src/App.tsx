import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ElectionsProvider } from './context/ElectionsContext';
import Layout from './components/Layout';
import { LoadingNote } from './components/Status';

const Overview = lazy(() => import('./routes/Overview'));
const Races = lazy(() => import('./routes/Races'));
const RaceDetail = lazy(() => import('./routes/RaceDetail'));
const CandidatePage = lazy(() => import('./routes/CandidatePage'));
const Donors = lazy(() => import('./routes/Donors'));
const DonorDetail = lazy(() => import('./routes/DonorDetail'));
const Employers = lazy(() => import('./routes/Employers'));
const EmployerDetail = lazy(() => import('./routes/EmployerDetail'));
const About = lazy(() => import('./routes/About'));
const NotFound = lazy(() => import('./routes/NotFound'));

export default function App() {
  return (
    <ElectionsProvider>
      <Routes>
        <Route element={<Layout />}>
          {/* "/" renders the latest substantial election's overview directly —
              a first-class canonical homepage, not a redirect. */}
          <Route path="/" element={wrap(<Overview />)} />
          <Route path="/about" element={wrap(<About />)} />
          <Route path="/e/:date" element={wrap(<Overview />)} />
          <Route path="/e/:date/races" element={wrap(<Races />)} />
          <Route path="/e/:date/races/:raceSlug" element={wrap(<RaceDetail />)} />
          <Route path="/e/:date/candidates/:slug" element={wrap(<CandidatePage />)} />
          <Route path="/e/:date/donors" element={wrap(<Donors />)} />
          <Route path="/e/:date/donors/:key" element={wrap(<DonorDetail />)} />
          <Route path="/e/:date/employers" element={wrap(<Employers />)} />
          <Route path="/e/:date/employers/:employerSlug" element={wrap(<EmployerDetail />)} />
          <Route path="*" element={wrap(<NotFound />)} />
        </Route>
      </Routes>
    </ElectionsProvider>
  );
}

function RouteFallback() {
  return (
    <div className="page container">
      <LoadingNote />
    </div>
  );
}

function wrap(element: JSX.Element) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}
