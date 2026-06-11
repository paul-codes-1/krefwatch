/**
 * Responsive data table: real <table> on desktop, card list on small screens.
 * Pattern adapted from the LFUCG contributors reference app
 * (~/lt/contributors/src/components/ResponsiveTable.tsx), re-implemented
 * without MUI.
 */
import type { ReactNode } from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';
import type { SortDirection } from '../lib/utils';

export interface Column<T, F extends string = string> {
  key: string;
  label: string;
  render: (row: T, index: number) => ReactNode;
  /** If set, the column header is a sort toggle. */
  sortField?: F;
  /** Right-align (numeric) on desktop. */
  align?: 'right';
  /** Mobile card title (exactly one column should set this). */
  primary?: boolean;
  /** Mobile card right-hand figure (typically the money column). */
  highlight?: boolean;
  /** Omit from the mobile card meta rows. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T, F extends string = string> {
  columns: Column<T, F>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  sortField?: F;
  sortDirection?: SortDirection;
  onSort?: (field: F) => void;
  caption?: string;
}

export default function DataTable<T, F extends string = string>({
  columns,
  rows,
  rowKey,
  sortField,
  sortDirection,
  onSort,
  caption,
}: DataTableProps<T, F>) {
  const isMobile = useIsMobile();

  if (isMobile) {
    const primaryCol = columns.find((c) => c.primary);
    const highlightCol = columns.find((c) => c.highlight);
    const metaCols = columns.filter((c) => !c.primary && !c.highlight && !c.hideOnMobile);

    return (
      <div className="card-list">
        {rows.map((row, i) => (
          <article className="card-row" key={rowKey(row, i)}>
            <div className="card-row-top">
              {primaryCol && <div className="card-row-title">{primaryCol.render(row, i)}</div>}
              {highlightCol && <div className="card-row-highlight">{highlightCol.render(row, i)}</div>}
            </div>
            {metaCols.length > 0 && (
              <div className="card-row-meta">
                {metaCols.map((col) => {
                  const content = col.render(row, i);
                  if (content === null || content === undefined || content === '' || content === '—') {
                    return null;
                  }
                  return (
                    <span key={col.key}>
                      <span className="meta-label">{col.label}: </span>
                      {content}
                    </span>
                  );
                })}
              </div>
            )}
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        {caption && <caption className="visually-hidden">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.align === 'right' ? 'align-right' : undefined} scope="col">
                {col.sortField && onSort ? (
                  <button
                    type="button"
                    className={sortField === col.sortField ? 'sorted' : undefined}
                    onClick={() => onSort(col.sortField as F)}
                    aria-label={`Sort by ${col.label}`}
                  >
                    {col.label}
                    <span className="sort-arrow" aria-hidden="true">
                      {sortField === col.sortField ? (sortDirection === 'asc' ? '▲' : '▼') : '△'}
                    </span>
                  </button>
                ) : (
                  col.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey(row, i)}>
              {columns.map((col) => (
                <td key={col.key} className={col.align === 'right' ? 'align-right' : undefined}>
                  {col.render(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
