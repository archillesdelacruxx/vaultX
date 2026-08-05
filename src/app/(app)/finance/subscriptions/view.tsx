"use client";

import {
  FileDown,
  FileSpreadsheet,
  Pencil,
  Plus,
  Repeat,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Modal } from "~/components/ui/modal";
import { PaginationBar } from "~/components/ui/pagination";
import { EmptyState } from "~/components/ui/primitives";
import { useConfirm } from "~/components/ui/confirm";
import { useToast } from "~/components/ui/toast";
import { downloadCsv, downloadXls } from "~/lib/export";
import { fmtDate, money, toDateInput } from "~/server/lib/format";
import { api, type RouterOutputs } from "~/trpc/react";

type Row = RouterOutputs["subscriptions"]["list"]["rows"][number];

const EMPTY_FORM = { name: "", amount: "", billingCycle: "monthly" as Row["billingCycle"], nextBilling: "", autoRenew: true, notes: "" };

export default function SubscriptionsPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const toast = useToast();
  const confirm = useConfirm();
  const utils = api.useUtils();

  const { data, isLoading } = api.subscriptions.list.useQuery({ q: debouncedQ, page }, { staleTime: 30_000 });

  const create = api.subscriptions.create.useMutation({
    onSuccess: () => {
      toast("success", "Subscription saved.");
      closeModal();
      void utils.subscriptions.list.invalidate();
      void utils.dashboard.overview.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const update = api.subscriptions.update.useMutation({
    onSuccess: () => {
      toast("success", "Subscription updated.");
      closeModal();
      void utils.subscriptions.list.invalidate();
      void utils.dashboard.overview.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const remove = api.subscriptions.remove.useMutation({
    onSuccess: () => {
      toast("success", "Subscription deleted.");
      void utils.subscriptions.list.invalidate();
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
      name: row.name,
      amount: String(row.amount),
      billingCycle: row.billingCycle,
      nextBilling: toDateInput(row.nextBilling),
      autoRenew: row.autoRenew,
      notes: row.notes ?? "",
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
      name: form.name,
      amount: Number(form.amount) || 0,
      billingCycle: form.billingCycle,
      nextBilling: form.nextBilling || null,
      autoRenew: form.autoRenew,
      notes: form.notes || null,
    };
    if (editing) update.mutate({ id: editing.id, ...payload });
    else create.mutate(payload);
  };

  const handleDelete = async (row: Row) => {
    const ok = await confirm({
      title: "Delete subscription",
      message: `Permanently delete "${row.name}"? This cannot be undone.`,
    });
    if (ok) remove.mutate({ id: row.id });
  };

  const exportRows = useMemo(
    () =>
      data?.rows.map((r) => ({
        name: r.name,
        amount: money(r.amount),
        cycle: r.billingCycle,
        nextBilling: r.nextBilling ? fmtDate(r.nextBilling) : "",
        autoRenew: r.autoRenew ? "Yes" : "No",
        notes: r.notes ?? "",
      })) ?? [],
    [data],
  );

  const doExport = (format: "csv" | "xls") => {
    const headers = ["Name", "Amount", "Cycle", "Next billing", "Auto renew", "Notes"];
    if (format === "csv") downloadCsv("subscriptions.csv", headers, exportRows);
    else downloadXls("subscriptions.xls", headers, exportRows, "Subscriptions");
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Subscriptions</h2>
            <p className="mt-0.5 text-xs text-slate-400">{data?.total ?? 0} active subscriptions</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input w-52 py-1.5 pl-10"
                placeholder="Search subscriptions…"
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
              <Plus className="h-4 w-4" /> New subscription
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card h-32 animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={Repeat} title="No subscriptions" description="Add your first subscription or adjust your search." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.rows.map((row) => (
              <div key={row.id} className="card flex flex-col transition hover:shadow-md">
                <div className="flex items-start justify-between gap-2 p-4 pb-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                      <Repeat className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900 dark:text-white">{row.name}</span>
                      <span className="block text-xs text-slate-400">
                        {row.billingCycle} · {row.nextBilling ? `next ${fmtDate(row.nextBilling)}` : "no schedule"}
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
                  <div className="text-lg font-bold text-slate-900 dark:text-white">${money(row.amount)}</div>
                  {row.notes ? <p className="mt-1 line-clamp-2 text-xs text-slate-400">{row.notes}</p> : null}
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
                  {row.autoRenew ? (
                    <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Auto-renew</span>
                  ) : (
                    <span className="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Manual</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {data ? <PaginationBar page={data.page} pages={data.pages} total={data.total} onChange={setPage} /> : null}
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit subscription" : "New subscription"}
        icon={<Repeat className="h-5 w-5 text-brand-600" />}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="sub-form"
              className="btn btn-primary"
              disabled={create.isPending || update.isPending}
            >
              Save subscription
            </button>
          </>
        }
      >
        <form id="sub-form" onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Netflix"
              required
              maxLength={190}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount</label>
              <input
                className="input"
                type="number"
                min={0}
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Billing cycle</label>
              <select
                className="input"
                value={form.billingCycle}
                onChange={(e) => setForm({ ...form, billingCycle: e.target.value as Row["billingCycle"] })}
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Next billing date</label>
            <input
              className="input"
              type="date"
              value={form.nextBilling}
              onChange={(e) => setForm({ ...form, nextBilling: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand-600"
              checked={form.autoRenew}
              onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })}
            />
            Auto-renew
          </label>
          <div>
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              maxLength={20000}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
