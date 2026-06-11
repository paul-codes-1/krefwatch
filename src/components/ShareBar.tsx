/** Horizontal share-of-total bar with a tabular percentage. */
export default function ShareBar({ value, max }: { value: number; max: number }) {
  const share = max > 0 ? Math.max(0, value) / max : 0;
  const pct = share * 100;
  return (
    <span className="share-bar">
      <span className="share-track">
        <span className="share-fill" style={{ width: `${Math.min(100, pct).toFixed(1)}%` }} />
      </span>
      <span className="share-pct">{pct >= 99.95 ? '100%' : `${pct.toFixed(1)}%`}</span>
    </span>
  );
}
