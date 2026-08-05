"use client";

import { Bell, CheckCheck, MailCheck, Trash2 } from "lucide-react";
import { useState } from "react";

import { PaginationBar } from "~/components/ui/pagination";
import { EmptyState } from "~/components/ui/primitives";
import { useConfirm } from "~/components/ui/confirm";
import { useToast } from "~/components/ui/toast";
import { cn } from "~/lib/cn";
import { fmtDateTime } from "~/server/lib/format";
import { api, type RouterOutputs } from "~/trpc/react";

type Row = RouterOutputs["notifications"]["list"]["rows"][number];

const TYPE_ICON: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  error: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  warning: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  info: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
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
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h2>
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
        <div className="card">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
        </div>
      ) : (
        <>
          <div className="card overflow-hidden p-0">
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.rows.map((row) => (
                <li
                  key={row.id}
                  className={cn(
                    "flex items-start gap-3 px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/60",
                    !row.is_read && "bg-brand-50/50 dark:bg-brand-500/5",
                  )}
                >
                  <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", TYPE_ICON[row.type] ?? TYPE_ICON.info)}>
                    <MailCheck className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{row.title}</span>
                      <span className="shrink-0 text-[11px] text-slate-400">{fmtDateTime(row.created_at)}</span>
                    </div>
                    {row.body ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{row.body}</p> : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!row.is_read ? (
                      <button
                        type="button"
                        className="icon-btn"
                        title="Mark as read"
                        onClick={() => markRead.mutate({ id: Number(row.id) })}
                      >
                        <CheckCheck className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button type="button" className="icon-btn" title="Delete" onClick={() => handleDelete(row)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {data ? <PaginationBar page={data.page} pages={data.pages} total={data.total} onChange={setPage} /> : null}
          </div>
        </>
      )}
    </div>
  );
}
