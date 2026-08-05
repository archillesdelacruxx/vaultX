import { ShieldCheck } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-3">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-500/10">
          <ShieldCheck className="h-5 w-5 text-brand-600" />
          <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-brand-500/60" />
        </div>
        <div>
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-1.5 h-3 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="card h-28 animate-pulse bg-slate-100 dark:bg-slate-800"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>

      <div className="card space-y-3.5 p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-4 animate-pulse rounded bg-slate-100 dark:bg-slate-800"
            style={{ width: `${90 - i * 10}%`, animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
