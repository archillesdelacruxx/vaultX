"use client";

import {
  CheckCircle2,
  FileDown,
  FileSpreadsheet,
  Pencil,
  Plus,
  Search,
  Trash2,
  CircleDot,
  Hourglass,
  NotebookText,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Modal } from "~/components/ui/modal";
import { PaginationBar } from "~/components/ui/pagination";
import { EmptyState } from "~/components/ui/primitives";
import { useConfirm } from "~/components/ui/confirm";
import { useToast } from "~/components/ui/toast";
import { downloadCsv, downloadXls } from "~/lib/export";
import { fmtDate, toDateInput } from "~/server/lib/format";
import { api, type RouterOutputs } from "~/trpc/react";

type Row = RouterOutputs["tasks"]["list"]["rows"][number];

const EMPTY_FORM = {
  title: "",
  description: "",
  status: "pending" as Row["status"],
  priority: "medium" as Row["priority"],
  due_date: "",
  tags: "",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
};

const PRIORITY_BADGE: Record<string, string> = {
  low: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  medium: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  high: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
};

const STATUS_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  pending: CircleDot,
  in_progress: Hourglass,
  done: CheckCircle2,
};

export default function TasksPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState<"all" | Row["status"]>("all");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const toast = useToast();
  const confirm = useConfirm();
  const utils = api.useUtils();

  const { data, isLoading } = api.tasks.list.useQuery({ q: debouncedQ, status, page }, { staleTime: 30_000 });

  const create = api.tasks.create.useMutation({
    onSuccess: () => {
      toast("success", "Task created.");
      closeModal();
      void utils.tasks.list.invalidate();
      void utils.dashboard.overview.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const update = api.tasks.update.useMutation({
    onSuccess: () => {
      toast("success", "Task updated.");
      closeModal();
      void utils.tasks.list.invalidate();
      void utils.dashboard.overview.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const remove = api.tasks.remove.useMutation({
    onSuccess: () => {
      toast("success", "Task deleted.");
      void utils.tasks.list.invalidate();
      void utils.dashboard.overview.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const setTaskStatus = api.tasks.setStatus.useMutation({
    onSuccess: () => {
      void utils.tasks.list.invalidate();
      void utils.dashboard.overview.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const search = () => {
    setPage(1);
    setDebouncedQ(q.trim());
  };

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditing(row);
    setForm({
      title: row.title,
      description: row.description ?? "",
      status: row.status,
      priority: row.priority,
      due_date: toDateInput(row.due_date),
      tags: row.tags ?? "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) update.mutate({ id: editing.id, ...form });
    else create.mutate(form);
  };

  const handleDelete = async (row: Row) => {
    const ok = await confirm({
      title: "Delete task",
      message: `Permanently delete "${row.title}"? This cannot be undone.`,
    });
    if (ok) remove.mutate({ id: row.id });
  };

  const cycleStatus = (row: Row) => {
    const next: Row["status"] = row.status === "pending" ? "in_progress" : row.status === "in_progress" ? "done" : "pending";
    setTaskStatus.mutate({ id: row.id, status: next });
  };

  const exportRows = useMemo(
    () =>
      data?.rows.map((r) => ({
        title: r.title,
        status: r.status,
        priority: r.priority,
        due: r.due_date ? fmtDate(r.due_date) : "",
        tags: r.tags ?? "",
        description: r.description ?? "",
      })) ?? [],
    [data],
  );

  const doExport = (format: "csv" | "xls") => {
    const headers = ["Title", "Status", "Priority", "Due", "Tags", "Description"];
    if (format === "csv") downloadCsv("tasks.csv", headers, exportRows);
    else downloadXls("tasks.xls", headers, exportRows, "Tasks");
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Tasks</h2>
            <p className="mt-0.5 text-xs text-slate-400">{data?.total ?? 0} tasks</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input w-44 py-1.5 pl-10"
                placeholder="Search tasks…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
              />
            </div>
            <select
              className="input w-36 py-1.5"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as typeof status);
                setPage(1);
              }}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
            <div className="flex items-center gap-1">
              <button type="button" className="icon-btn" title="Export CSV" onClick={() => doExport("csv")}>
                <FileDown className="h-4 w-4" />
              </button>
              <button type="button" className="icon-btn" title="Export Excel" onClick={() => doExport("xls")}>
                <FileSpreadsheet className="h-4 w-4" />
              </button>
            </div>
            <button type="button" className="btn btn-primary" onClick={openNew}>
              <Plus className="h-4 w-4" /> New task
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card h-36 animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={NotebookText} title="No tasks found" description="Create a task or adjust your filters." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.rows.map((row) => {
              const StatusIcon = STATUS_ICON[row.status] ?? CircleDot;
              return (
                <div key={row.id} className="card flex flex-col transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-2 p-4 pb-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => cycleStatus(row)}
                        className="shrink-0 text-slate-300 transition hover:text-brand-600 dark:text-slate-600"
                        title={`Status: ${row.status}. Click to change`}
                      >
                        <StatusIcon className="h-5 w-5" />
                      </button>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900 dark:text-white">{row.title}</span>
                        <span className="block text-xs text-slate-400">
                          {row.due_date ? `Due ${fmtDate(row.due_date)}` : "No due date"}
                        </span>
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button type="button" className="icon-btn" title="Edit" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" className="icon-btn" title="Delete" onClick={() => handleDelete(row)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 px-4 pb-3">
                    {row.description ? (
                      <p className="line-clamp-2 text-xs text-slate-400">{row.description}</p>
                    ) : null}
                    {row.tags ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {row.tags.split(",").map((t) => (
                          <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            {t.trim()}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
                    <span className={`badge ${STATUS_BADGE[row.status] ?? STATUS_BADGE.pending}`}>{row.status.replace("_", " ")}</span>
                    <span className={`badge ${PRIORITY_BADGE[row.priority] ?? PRIORITY_BADGE.medium}`}>{row.priority}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {data ? <PaginationBar page={data.page} pages={data.pages} total={data.total} onChange={setPage} /> : null}
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit task" : "New task"}
        icon={<NotebookText className="h-5 w-5 text-brand-600" />}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="task-form"
              className="btn btn-primary"
              disabled={create.isPending || update.isPending}
            >
              Save task
            </button>
          </>
        }
      >
        <form id="task-form" onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Pay electricity bill"
              required
              maxLength={190}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={2000}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Row["status"] })}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select
                className="input"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as Row["priority"] })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Due date</label>
            <input
              className="input"
              type="date"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Tags</label>
            <input
              className="input"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="comma, separated"
              maxLength={190}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
