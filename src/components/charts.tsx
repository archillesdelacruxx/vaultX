"use client";

import { useMemo } from "react";

import { cn } from "~/lib/cn";

export function CashflowChart({
  data,
}: {
  data: Array<{ month: Date; income: number; expenses: number }>;
}) {
  const { max, bars } = useMemo(() => {
    const months = data.map((d) => {
      const label = new Date(d.month).toLocaleDateString("en-US", { month: "short" });
      return { ...d, label };
    });
    const max = Math.max(1, ...months.flatMap((d) => [d.income, d.expenses]));
    return { max, bars: months };
  }, [data]);

  const plotH = 160;

  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-600" /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-400" /> Expenses
        </span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3" style={{ height: plotH }}>
        {bars.map((b) => {
          const incH = Math.round((b.income / max) * plotH);
          const expH = Math.round((b.expenses / max) * plotH);
          return (
            <div key={b.month.toString()} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-[140px] w-full items-end justify-center gap-1.5">
                <div
                  title={`${b.label} income: ${b.income.toFixed(2)}`}
                  className="w-3 rounded-t bg-brand-600 transition-all"
                  style={{ height: incH }}
                />
                <div
                  title={`${b.label} expenses: ${b.expenses.toFixed(2)}`}
                  className="w-3 rounded-t bg-red-400 transition-all"
                  style={{ height: expH }}
                />
              </div>
              <span className="text-[11px] font-medium text-slate-400">{b.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const DONUT_COLORS = [
  "#3371fc",
  "#f43f5e",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#06b6d4",
  "#64748b",
];

export function CategoryDonut({
  data,
}: {
  data: Array<{ category: string; total: number }>;
}) {
  const { segments, total, top } = useMemo(() => {
    const total = data.reduce((s, d) => s + d.total, 0);
    let acc = 0;
    const segments = data.map((d, i) => {
      const start = acc;
      acc += d.total;
      return { ...d, color: DONUT_COLORS[i % DONUT_COLORS.length], start, end: acc };
    });
    const top = [...data].sort((a, b) => b.total - a.total)[0];
    return { segments, total, top };
  }, [data]);

  if (total === 0) {
    return (
      <div className="flex h-44 items-center justify-center text-xs text-slate-400">
        No expenses recorded this month yet.
      </div>
    );
  }

  const R = 70;
  const C = 2 * Math.PI * R;

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-44 w-44 shrink-0">
        <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
          {segments.map((s, i) => {
            const frac = s.total / total;
            return (
              <circle
                key={i}
                cx="80"
                cy="80"
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth="22"
                strokeDasharray={`${frac * C} ${C}`}
                strokeDashoffset={-((s.start / total) * C)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-slate-900 dark:text-white">
            {top?.category ?? ""}
          </span>
          <span className="text-xs text-slate-400">
            {top ? `${Math.round((top.total / total) * 100)}%` : ""}
          </span>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="truncate text-slate-600 dark:text-slate-300">{s.category}</span>
            <span className="ml-auto font-medium text-slate-400">
              {Math.round((s.total / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div
        className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-emerald-500" : "bg-brand-600")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
