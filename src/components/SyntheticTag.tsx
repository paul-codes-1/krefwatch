import { syntheticLabel } from '../lib/synthetic';

/** Muted chip identifying synthetic donor rows (small-dollar bundles, self-funding, …). */
export default function SyntheticTag({ donorKey }: { donorKey: string }) {
  const label = syntheticLabel(donorKey);
  if (!label) return null;
  return <span className="tag">{label}</span>;
}
