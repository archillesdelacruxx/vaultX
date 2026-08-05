"use client";

import { ScrollText, Search } from "lucide-react";
import { useState } from "react";

import { PaginationBar } from "~/components/ui/pagination";
import { EmptyState, PageLoader } from "~/components/ui/primitives";
import { fmtDateTime } from "~/server/lib/format";
import { api } from "~/trpc/react";

const ACTION_TONE: Record<string, string> = {
  create: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  update: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  delete: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
};

export default function AuditLogsPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = api.admin.auditLogs.useQuery({ q: debouncedQ, page }, { staleTime: 30_000 });

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Audit Logs</h2>
            <p className="mt-0.5 text-xs text-slate-400">{data?.total ?? 0} events</p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input w-64 py-1.5 pl-10"
              placeholder="Search action, entity, IP…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setPage(1), setDebouncedQ(q.trim()))}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : !data || data.rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={ScrollText} title="No audit events" description="Activity will appear here as you use VaultX." />
        </div>
      ) : (
        <>
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    <th className="px-5 py-3 font-semibold">Timestamp</th>
                    <th className="px-5 py-3 font-semibold">User</th>
                    <th className="px-5 py-3 font-semibold">Action</th>
                    <th className="px-5 py-3 font-semibold">Entity</th>
                    <th className="px-5 py-3 font-semibold">IP</th>
                    <th className="px-5 py-3 font-semibold">User agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.rows.map((row) => (
                    <tr key={row.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500 dark:text-slate-300">
                        {fmtDateTime(row.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-200">{row.email ?? "—"}</div>
                        <div className="text-[11px] text-slate-400">#{row.userId ?? "system"}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={
                            (ACTION_TONE[row.action.split(".").at(-1) ?? ""] ??
                              "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300") +
                            " badge"
                          }
                        >
                          {row.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-300">
                        {row.entityType ?? "—"}
                        {row.entityId ? ` #${row.entityId}` : ""}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-400">{row.ip ?? "—"}</td>
                      <td className="max-w-[180px] truncate px-5 py-3 text-xs text-slate-400">{row.userAgent ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data ? <PaginationBar page={data.page} pages={data.pages} total={data.total} onChange={setPage} /> : null}
          </div>
        </>
      )}
    </div>
  );
}
