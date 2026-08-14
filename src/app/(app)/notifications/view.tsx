"use client";

import {
  Bell,
  BellDot,
  BellRing,
  CheckCheck,
  CircleCheckBig,
  Info,
  MailCheck,
  TriangleAlert,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import { PaginationBar } from "~/components/ui/pagination";
import { EmptyState, StatCard } from "~/components/ui/primitives";
import { useConfirm } from "~/components/ui/confirm";
import { useToast } from "~/components/ui/toast";
import { cn } from "~/lib/cn";
import { fmtDateTime } from "~/server/lib/format";
import { api, type RouterOutputs } from "~/trpc/react";

type Row = RouterOutputs["notifications"]["list"]["rows"][number];

const TYPE_STYLE: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  error: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  info: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
};

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  success: CircleCheckBig,
  error: XCircle,
  warning: TriangleAlert,
  info: Info,
};

const TYPE_RING: Record<string, string> = {
  success: "group-hover:border-emerald-300 dark:group-hover:border-emerald-600",
  error: "group-hover:border-red-300 dark:group-hover:border-red-600",
  warning: "group-hover:border-amber-300 dark:group-hover:border-amber-600",
  info: "group-hover:border-brand-300 dark:group-hover:border-brand-600",
};

export default function NotificationsPage() {
  const [page, setPage] = useState(1);

  const toast = useToast();
  const confirm = useConfirm();
  const utils = api.useUtils();

  const { data, isLoading } = api.notifications.list.useQuery({ page }, { staleTime: 30_000 });

  const markRead = api.notifications.markRead.useMutation({
    onSuccess: () => {
      void utils.notifications.list.invalidate();
      void utils.notifications.unreadCount.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const markAllRead = api.notifications.markAllRead.useMutation({
    onSuccess: () => {
      toast("success", "All notifications marked as read.");
      void utils.notifications.list.invalidate();
      void utils.notifications.unreadCount.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const remove = api.notifications.remove.useMutation({
    onSuccess: () => {
      void utils.notifications.list.invalidate();
      void utils.notifications.unreadCount.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const clearAll = api.notifications.clearAll.useMutation({
    onSuccess: () => {
      toast("success", "All notifications cleared.");
      void utils.notifications.list.invalidate();
      void utils.notifications.unreadCount.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const unreadCount = data?.rows.filter((r) => !r.is_read).length ?? 0;
  const readCount = Math.max(0, (data?.total ?? 0) - unreadCount);

  const handleDelete = async (row: Row) => {
    const ok = await confirm({ title: "Delete notification", message: "Remove this notification?" });
    if (ok) remove.mutate({ id: Number(row.id) });
  };

  const handleClearAll = async () => {
    const ok = await confirm({ title: "Clear all", message: "Delete all notifications? This cannot be undone." });
    if (ok) clearAll.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total notifications" value={String(data?.total ?? 0)} icon={Bell} tone="brand" />
        <StatCard label="Unread" value={String(unreadCount)} icon={BellDot} tone="amber" />
        <StatCard label="Read" value={String(readCount)} icon={BellRing} tone="green" />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Bell className="h-4 w-4 text-brand-600" />
              Inbox
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {unreadCount} unread of {data?.total ?? 0}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => markAllRead.mutate()}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
            <button type="button" className="btn btn-danger" onClick={handleClearAll} disabled={!data?.rows.length}>
              <Trash2 className="h-4 w-4" /> Clear all
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.rows.map((row) => {
              const Icon = TYPE_ICON[row.type] ?? Info;
              return (
                <div
                  key={row.id}
                  className={cn(
                    "group relative flex items-start gap-3 overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md dark:bg-slate-900",
                    !row.is_read
                      ? "border-brand-200 ring-1 ring-brand-100 dark:border-brand-500/30 dark:ring-brand-500/10"
                      : "border-slate-200 dark:border-slate-800",
                    TYPE_RING[row.type] ?? TYPE_RING.info,
                  )}
                >
                  {!row.is_read ? (
                    <span className="absolute left-0 top-4 h-8 w-1 rounded-r-full bg-brand-500" />
                  ) : null}
                  <span
                    className={cn(
                      "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      TYPE_STYLE[row.type] ?? TYPE_STYLE.info,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {row.title}
                      </span>
                      {!row.is_read ? (
                        <span className="mt-1 shrink-0 rounded-full bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                          New
                        </span>
                      ) : null}
                    </div>
                    {row.body ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {row.body}
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400">{fmtDateTime(row.created_at)}</span>
                      <div className="flex shrink-0 items-center gap-1 opacity-70 transition group-hover:opacity-100">
                        {!row.is_read ? (
                          <button
                            type="button"
                            className="icon-btn"
                            title="Mark as read"
                            onClick={() => markRead.mutate({ id: Number(row.id) })}
                          >
                            <MailCheck className="h-4 w-4" />
                          </button>
                        ) : null}
                        <button type="button" className="icon-btn" title="Delete" onClick={() => handleDelete(row)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {data ? <PaginationBar page={data.page} pages={data.pages} total={data.total} onChange={setPage} /> : null}
        </>
      )}
    </div>
  );
}
