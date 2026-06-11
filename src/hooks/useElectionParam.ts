import { useParams } from 'react-router-dom';
import { useElections } from '../context/ElectionsContext';
import type { ElectionMeta } from '../lib/types';

export interface ElectionParam {
  date: string;
  election: ElectionMeta | null;
}

/**
 * Read the :date route param and resolve it against the election index.
 * When there is no :date param (the `/` homepage renders the latest
 * substantial election's overview directly), falls back to the default
 * election so `/` is a first-class page, not a redirect.
 */
export function useElectionParam(): ElectionParam {
  const { date } = useParams<{ date: string }>();
  const { byDate, defaultElection } = useElections();
  if (!date) {
    return { date: defaultElection.date, election: defaultElection };
  }
  return { date, election: byDate.get(date) ?? null };
}
