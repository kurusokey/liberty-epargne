export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header card skeleton */}
      <div className="card p-6">
        <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-10 w-48 rounded bg-slate-200 dark:bg-slate-700 mt-3" />
        <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700 mt-4" />
        <div className="flex gap-6 mt-4">
          <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>

      {/* Chart skeleton */}
      <div className="card p-6">
        <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="h-48 w-full rounded bg-slate-200 dark:bg-slate-700 mt-4" />
      </div>

      {/* Category cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="card p-5">
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-7 w-28 rounded bg-slate-200 dark:bg-slate-700 mt-3" />
            <div className="h-3 w-36 rounded bg-slate-200 dark:bg-slate-700 mt-2" />
            <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-700 mt-2" />
          </div>
        ))}
      </div>

      {/* Months grid skeleton */}
      <div className="card p-6">
        <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-700" />
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    </div>
  );
}
