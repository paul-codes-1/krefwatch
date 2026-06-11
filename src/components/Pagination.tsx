interface PaginationProps {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}

export default function Pagination({ page, pageCount, onPage }: PaginationProps) {
  if (pageCount <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1}>
        ← Prev
      </button>
      <span className="page-status">
        Page {page} of {pageCount}
      </span>
      <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pageCount}>
        Next →
      </button>
    </nav>
  );
}
