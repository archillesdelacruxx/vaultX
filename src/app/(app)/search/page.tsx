"use client";

import {
  Banknote,
  FileKey2,
  FileText,
  FolderLock,
  LifeBuoy,
  LockKeyhole,
  NotebookPen,
  PiggyBank,
  ReceiptText,
  Repeat,
  Search,
  StickyNote,
  Target,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { EmptyState, PageLoader } from "~/components/ui/primitives";
import { api } from "~/trpc/react";

const SECTIONS: Array<{
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}> = [
  { key: "passwords", label: "Passwords", icon: LockKeyhole, tone: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" },
  { key: "notes", label: "Notes", icon: StickyNote, tone: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" },
  { key: "apiKeys", label: "API Keys", icon: FileKey2, tone: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400" },
  { key: "licenses", label: "Licenses", icon: FileText, tone: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400" },
  { key: "emergency", label: "Emergency", icon: LifeBuoy, tone: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" },
  { key: "banking", label: "Banking", icon: Banknote, tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
  { key: "savings", label: "Savings", icon: PiggyBank, tone: "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400" },
  { key: "expenses", label: "Expenses", icon: ReceiptText, tone: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400" },
  { key: "income", label: "Income", icon: Wallet, tone: "bg-lime-50 text-lime-600 dark:bg-lime-500/10 dark:text-lime-400" },
  { key: "subscriptions", label: "Subscriptions", icon: Repeat, tone: "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400" },
  { key: "goals", label: "Goals", icon: Target, tone: "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-400" },
  { key: "tasks", label: "Tasks", icon: ReceiptText, tone: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  { key: "journal", label: "Journal", icon: NotebookPen, tone: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400" },
  { key: "documents", label: "Documents", icon: FolderLock, tone: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" },
];

export default function SearchPage() {
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [q, setQ] = useState(initial);

  const { data, isLoading } = api.search.all.useQuery({ q }, { enabled: q.trim().length > 0, staleTime: 30_000 });

  const total = useMemo(
    () =>
      data
        ? SECTIONS.reduce((acc, s) => acc + (data[s.key as keyof typeof data] as Array<unknown>).length, 0)
        : 0,
    [data],
  );

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input w-full py-2 pl-10"
              placeholder="Search your vault…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>
          <p className="text-xs text-slate-400">{data ? `${total} result${total === 1 ? "" : "s"} for "${data.q}"` : "Search across all your vault data."}</p>
        </div>
      </div>

      {q.trim().length === 0 ? (
        <div className="card">
          <EmptyState icon={Search} title="Type to search" description="Find passwords, notes, finances, documents and more." />
        </div>
      ) : isLoading ? (
        <PageLoader />
      ) : !data || total === 0 ? (
        <div className="card">
          <EmptyState icon={Search} title="No results" description={`Nothing found for "${q}". Try different keywords.`} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {SECTIONS.filter((s) => (data[s.key as keyof typeof data] as Array<unknown>).length > 0).map((s) => {
            const rows = data[s.key as keyof typeof data] as Array<{ id: number; title: string; subtitle: string; link: string }>;
            return (
              <div key={s.key} className="card p-0">
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                  <span className={s.tone + " flex h-7 w-7 items-center justify-center rounded-lg"}>
                    <s.icon className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{s.label}</h3>
                  <span className="ml-auto text-xs text-slate-400">{rows.length}</span>
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rows.map((row) => (
                    <li key={row.id}>
                      <Link href={row.link} className="block px-5 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{row.title}</div>
                        {row.subtitle ? <div className="truncate text-xs text-slate-400">{row.subtitle}</div> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
