"use client";

import { Database, Download, RefreshCw } from "lucide-react";

import { Card } from "~/components/ui/primitives";
import { useToast } from "~/components/ui/toast";
import { fmtDateTime } from "~/server/lib/format";
import { api } from "~/trpc/react";

export default function BackupPage() {
  const toast = useToast();

  const { data, isLoading, isError, refetch, isFetching } = api.admin.backup.useQuery(undefined, {
    staleTime: 0,
    retry: false,
  });

  const download = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vaultx-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("success", "Backup downloaded.");
  };

  const sections = data
    ? [
        { label: "Users", count: data.users.length },
        { label: "Passwords", count: data.passwords.length },
        { label: "Notes", count: data.notes.length },
        { label: "API Keys", count: data.apiKeys.length },
        { label: "Licenses", count: data.licenses.length },
        { label: "Emergency", count: data.emergency.length },
        { label: "Banking", count: data.banking.length },
        { label: "Expenses", count: data.expenses.length },
        { label: "Income", count: data.income.length },
        { label: "Savings", count: data.savings.length },
        { label: "Subscriptions", count: data.subscriptions.length },
        { label: "Goals", count: data.goals.length },
        { label: "Tasks", count: data.tasks.length },
        { label: "Journal", count: data.journal.length },
        { label: "Documents", count: data.documents.length },
        { label: "Notifications", count: data.notifications.length },
        { label: "Audit logs", count: data.auditLogs.length },
      ]
    : [];

  const totalRecords = sections.reduce((acc, s) => acc + s.count, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <Database className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Full database backup</h2>
            <p className="text-xs text-slate-400">
              Exports every table as a JSON file. Encrypted fields are exported in their encrypted form.
            </p>
            {data ? (
              <p className="mt-1 text-xs text-slate-400">
                {sections.length} tables · {totalRecords} records · generated {fmtDateTime(data.generatedAt)}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh snapshot"
            >
              <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </button>
            <button type="button" className="btn btn-primary" onClick={download} disabled={!data || isLoading}>
              <Download className="h-4 w-4" /> Download JSON
            </button>
          </div>
        </div>
      </Card>

      {isError && !data ? (
        <Card title="Could not load backup">
          <p className="text-sm text-slate-500 dark:text-slate-300">
            You do not have permission to view this data. Admin access is required.
          </p>
        </Card>
      ) : null}

      {data ? (
        <Card title="Snapshot summary" subtitle="Record counts per table.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {sections.map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-100 px-4 py-3 dark:border-slate-800">
                <div className="text-lg font-bold text-slate-900 dark:text-white">{s.count}</div>
                <div className="text-xs font-medium text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
