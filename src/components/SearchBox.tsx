interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}

export default function SearchBox({ value, onChange, placeholder, label }: SearchBoxProps) {
  return (
    <div className="search-box">
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <circle cx="6" cy="6" r="4.5" fill="none" stroke="#8d8571" strokeWidth="1.5" />
        <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="#8d8571" strokeWidth="1.5" />
      </svg>
      <input
        type="search"
        name="q"
        className="search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
      {value && (
        <button type="button" className="search-clear" onClick={() => onChange('')} aria-label="Clear search">
          ×
        </button>
      )}
    </div>
  );
}
