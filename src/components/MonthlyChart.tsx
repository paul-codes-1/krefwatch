import { useMemo } from 'react';
import type { MonthTotal } from '../lib/types';
import { formatMoney, formatMonthLabel, formatMonthShort } from '../lib/format';

const W = 760;
const H = 220;
const PAD_TOP = 18;
const PAD_BOTTOM = 26;
const PLOT_H = H - PAD_TOP - PAD_BOTTOM;

/** Fill gaps so skipped months render as empty slots rather than vanishing. */
function fillMonths(monthly: MonthTotal[]): MonthTotal[] {
  if (monthly.length === 0) return [];
  const sorted = [...monthly].sort((a, b) => a.month.localeCompare(b.month));
  const byMonth = new Map(sorted.map((m) => [m.month, m.total]));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) return sorted;

  const out: MonthTotal[] = [];
  let [y = 0, m = 1] = first.month.split('-').map(Number);
  const [lastY = 0, lastM = 1] = last.month.split('-').map(Number);
  while (y < lastY || (y === lastY && m <= lastM)) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    out.push({ month: key, total: byMonth.get(key) ?? 0 });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/**
 * Small custom SVG bar chart of money by month — no chart library.
 * Bars carry <title> tooltips; January of each year is labeled on the axis.
 */
export default function MonthlyChart({ monthly }: { monthly: MonthTotal[] }) {
  const months = useMemo(() => fillMonths(monthly), [monthly]);

  if (months.length === 0) {
    return <p className="section-note">No dated contributions to chart.</p>;
  }

  const max = Math.max(...months.map((m) => m.total), 1);
  const n = months.length;
  const gap = n > 36 ? 1.5 : 3;
  const barW = (W - gap * (n - 1)) / n;
  const x = (i: number) => i * (barW + gap);
  const barH = (total: number) => (total <= 0 ? 0 : Math.max(1.5, (total / max) * PLOT_H));

  // Axis labels: each January, plus the first and last month if not already labeled.
  const labeled = new Set<number>();
  months.forEach((m, i) => {
    if (m.month.endsWith('-01')) labeled.add(i);
  });
  labeled.add(0);
  labeled.add(n - 1);
  // Drop labels that would collide (closer than ~7% of the width).
  const minGap = Math.ceil(n * 0.09);
  const labelIdx: number[] = [];
  for (const i of [...labeled].sort((a, b) => a - b)) {
    const prev = labelIdx[labelIdx.length - 1];
    if (prev === undefined || i - prev >= minGap) labelIdx.push(i);
  }

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Contributions by month, peaking at ${formatMoney(max)}`}
    >
      {/* gridlines at 50% and 100% of max */}
      <line className="chart-gridline" x1={0} x2={W} y1={PAD_TOP} y2={PAD_TOP} />
      <line
        className="chart-gridline"
        x1={0}
        x2={W}
        y1={PAD_TOP + PLOT_H / 2}
        y2={PAD_TOP + PLOT_H / 2}
      />
      <text className="chart-max-label" x={0} y={PAD_TOP - 6}>
        {formatMoney(max)} / mo peak
      </text>

      {months.map((m, i) => {
        const h = barH(m.total);
        return (
          <rect
            key={m.month}
            className="chart-bar"
            x={x(i)}
            y={PAD_TOP + PLOT_H - h}
            width={barW}
            height={h}
          >
            <title>{`${formatMonthLabel(m.month)} — ${formatMoney(m.total)}`}</title>
          </rect>
        );
      })}

      <line
        className="chart-baseline"
        x1={0}
        x2={W}
        y1={PAD_TOP + PLOT_H + 0.75}
        y2={PAD_TOP + PLOT_H + 0.75}
      />

      {labelIdx.map((i) => {
        const m = months[i];
        if (!m) return null;
        const anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle';
        const tx = i === 0 ? x(i) : i === n - 1 ? x(i) + barW : x(i) + barW / 2;
        return (
          <text key={m.month} className="chart-axis-label" x={tx} y={H - 8} textAnchor={anchor}>
            {formatMonthShort(m.month)}
          </text>
        );
      })}
    </svg>
  );
}
