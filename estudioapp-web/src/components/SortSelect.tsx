// src/components/SortSelect.tsx

interface SortOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SortOption<T>[];
}

export function SortSelect<T extends string>({ value, onChange, options }: Props<T>) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="rounded-xl border border-neutral-200 bg-surface px-3 py-2.5 text-[13px] text-neutral-600 focus:border-coral focus:outline-none"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
