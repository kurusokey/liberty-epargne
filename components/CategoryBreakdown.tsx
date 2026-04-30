import { formatEUR } from "@/lib/constants";

interface Slice {
  label: string;
  value: number;
  color: string;
}

export function CategoryBreakdown({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((acc, s) => acc + s.value, 0);
  if (total === 0) {
    return (
      <p className="text-sm text-slate-500">
        Pas encore de versements — la répartition apparaîtra ici.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {slices.map((s) => (
          <div
            key={s.label}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
            title={`${s.label} : ${formatEUR(s.value)}`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-y-2 text-sm">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: s.color }}
            />
            <span className="flex-1 text-slate-600 dark:text-slate-400">{s.label}</span>
            <span className="font-medium">{formatEUR(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
