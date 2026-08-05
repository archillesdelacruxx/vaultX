"use client";

import {
  FileDown,
  FileSpreadsheet,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Modal } from "~/components/ui/modal";
import { PaginationBar } from "~/components/ui/pagination";
import { EmptyState } from "~/components/ui/primitives";
import { ProgressBar } from "~/components/charts";
import { useConfirm } from "~/components/ui/confirm";
import { useToast } from "~/components/ui/toast";
import { downloadCsv, downloadXls } from "~/lib/export";
import { fmtDate, money, toDateInput } from "~/server/lib/format";
import { api, type RouterOutputs } from "~/trpc/react";

type Row = RouterOutputs["goals"]["list"]["rows"][number];

const EMPTY_FORM = { title: "", description: "", targetAmount: "", savedAmount: "", deadline: "", status: "active" as Row["status"] };

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  paused: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  completed: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300",
};

export default function GoalsPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const toast = useToast();
  const confirm = useConfirm();
  const utils = api.useUtils();

  const { data, isLoading } = api.goals.list.useQuery({ q: debouncedQ, page }, { staleTime: 30_000 });

  const create = api.goals.create.useMutation({
    onSuccess: () => {
      toast("success", "Goal created.");
      closeModal();
      void utils.goals.list.invalidate();
      void utils.dashboard.overview.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const update = api.goals.update.useMutation({
    onSuccess: () => {
      toast("success", "Goal updated.");
      closeModal();
      void utils.goals.list.invalidate();
      void utils.dashboard.overview.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const remove = api.goals.remove.useMutation({
    onSuccess: () => {
      toast("success", "Goal deleted.");
      void utils.goals.list.invalidate();
      void utils.dashboard.overview.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const setStatus = api.goals.setStatus.useMutation({
    onSuccess: () => {
      void utils.goals.list.invalidate();
      void utils.dashboard.overview.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

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
      targetAmount: String(row.targetAmount),
      savedAmount: String(row.savedAmount),
      deadline: toDateInput(row.deadline),
      status: row.status,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      description: form.description || null,
      targetAmount: Number(form.targetAmount) || 0,
      savedAmount: Number(form.savedAmount) || 0,
      deadline: form.deadline || null,
      status: form.status,
    };
    if (editing) update.mutate({ id: editing.id, ...payload });
    else create.mutate(payload);
  };

  const handleDelete = async (row: Row) => {
    const ok = await confirm({
      title: "Delete goal",
      message: `Permanently delete "${row.title}"? This cannot be undone.`,
    });
    if (ok) remove.mutate({ id: row.id });
  };

  const cycleStatus = (row: Row) => {
    const next: Row["status"] = row.status === "active" ? "paused" : row.status === "paused" ? "completed" : "active";
    setStatus.mutate({ id: row.id, status: next });
  };

  const exportRows = useMemo(
    () =>
      data?.rows.map((r) => ({
        title: r.title,
        current: money(r.savedAmount),
        target: money(r.targetAmount),
        deadline: r.deadline ? fmtDate(r.deadline) : "",
        status: r.status,
      })) ?? [],
    [data],
  );

  const doExport = (format: "csv" | "xls") => {
    const headers = ["Title", "Saved", "Target", "Deadline", "Status"];
    if (format === "csv") downloadCsv("goals.csv", headers, exportRows);
    else downloadXls("goals.xls", headers, exportRows, "Goals");
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Goals</h2>
            <p className="mt-0.5 text-xs text-slate-400">{data?.total ?? 0} goals</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input w-52 py-1.5 pl-10"
                placeholder="Search goals…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (setPage(1), setDebouncedQ(q.trim()))}
              />
            </div>
            <div className="flex items-center gap-1">
              <button type="button" className="icon-btn" title="Export CSV" onClick={() => doExport("csv")}>
                <FileDown className="h-4 w-4" />
              </button>
              <button type="button" className="icon-btn" title="Export Excel" onClick={() => doExport("xls")}>
                <FileSpreadsheet className="h-4 w-4" />
              </button>
            </div>
            <button type="button" className="btn btn-primary" onClick={openNew}>
              <Plus className="h-4 w-4" /> New goal
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card h-44 animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={Target} title="No goals yet" description="Create your first goal or adjust your search." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.rows.map((row) => {
              const pct = row.targetAmount > 0 ? Math.min(100, Math.round((row.savedAmount / row.targetAmount) * 100)) : 0;
              return (
                <div key={row.id} className="card flex flex-col transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-2 p-4 pb-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                        <Target className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900 dark:text-white">{row.title}</span>
                        <span className="block text-xs text-slate-400">
                          {row.deadline ? `Due ${fmtDate(row.deadline)}` : "No deadline"}
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
                  <div className="flex-1 px-4 pb-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-900 dark:text-white">${money(row.savedAmount)}</span>
                      <span className="text-xs text-slate-400">of ${money(row.targetAmount)}</span>
                    </div>
                    <ProgressBar value={row.savedAmount} max={row.targetAmount} />
                    <div className="mt-2 text-xs font-medium text-slate-400">{pct}% complete</div>
                    {row.description ? <p className="mt-2 line-clamp-2 text-xs text-slate-400">{row.description}</p> : null}
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => cycleStatus(row)}
                      className={`badge cursor-pointer transition hover:opacity-80 ${STATUS_BADGE[row.status] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
                      title="Click to change status"
                    >
                      {row.status}
                    </button>
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
        title={editing ? "Edit goal" : "New goal"}
        icon={<Target className="h-5 w-5 text-brand-600" />}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="goal-form"
              className="btn btn-primary"
              disabled={create.isPending || update.isPending}
            >
              Save goal
            </button>
          </>
        }
      >
        <form id="goal-form" onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Buy a laptop"
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
              maxLength={20000}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Saved so far</label>
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                value={form.savedAmount}
                onChange={(e) => setForm({ ...form, savedAmount: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Target amount</label>
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Deadline</label>
              <input
                className="input"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Row["status"] })}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
