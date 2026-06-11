import { createContext, useContext, type ReactNode } from 'react';
import { getElections } from '../lib/api';
import { useData } from '../hooks/useData';
import type { ElectionMeta, ElectionsIndex } from '../lib/types';
import { LoadingNote, ErrorNote } from '../components/Status';

interface ElectionsContextValue {
  index: ElectionsIndex;
  elections: ElectionMeta[];
  /** First election with substantial data (contributionCount > 1000), fallback newest. */
  defaultElection: ElectionMeta;
  byDate: Map<string, ElectionMeta>;
}

const ElectionsContext = createContext<ElectionsContextValue | null>(null);

export function ElectionsProvider({ children }: { children: ReactNode }) {
  const { data, loading, error } = useData(getElections, 'elections');

  if (loading) {
    return (
      <div className="container">
        <LoadingNote label="Loading election index…" />
      </div>
    );
  }
  if (error || !data || data.elections.length === 0) {
    return (
      <div className="container">
        <ErrorNote message={error ?? 'Election index is empty.'} />
      </div>
    );
  }

  const elections = data.elections;
  const first = elections[0];
  if (!first) {
    return (
      <div className="container">
        <ErrorNote message="Election index is empty." />
      </div>
    );
  }
  const defaultElection = elections.find((e) => e.contributionCount > 1000) ?? first;
  const byDate = new Map(elections.map((e) => [e.date, e]));

  return (
    <ElectionsContext.Provider value={{ index: data, elections, defaultElection, byDate }}>
      {children}
    </ElectionsContext.Provider>
  );
}

export function useElections(): ElectionsContextValue {
  const ctx = useContext(ElectionsContext);
  if (!ctx) throw new Error('useElections must be used inside ElectionsProvider');
  return ctx;
}
