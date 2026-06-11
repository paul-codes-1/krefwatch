export function LoadingNote({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="status-note loading" role="status">
      {label}
    </p>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p className="status-note error" role="alert">
      {message}
      <span className="retry-hint">Reload the page to try again.</span>
    </p>
  );
}

export function EmptyNote({ message }: { message: string }) {
  return <p className="status-note">{message}</p>;
}
