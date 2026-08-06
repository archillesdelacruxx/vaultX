"use client";

import {
  FileDown,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Modal } from "~/components/ui/modal";
import { PaginationBar } from "~/components/ui/pagination";
import { EmptyState } from "~/components/ui/primitives";
import { useConfirm } from "~/components/ui/confirm";
import { useToast } from "~/components/ui/toast";
import { downloadCsv, downloadXls } from "~/lib/export";
import { fmtDate, money, moneyAmount, toDateInput } from "~/server/lib/format";
import { useCurrency } from "~/components/currency-context";
import { api, type RouterOutputs } from "~/trpc/react";

type Row = RouterOutputs["expenses"]["list"]["rows"][number];

const EMPTY_FORM = { title: "", amount: "", category: "", paidOn: "", notes: "" };

export default function ExpensesPage() {
  const currency = useCurrency();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [suggesting, setSuggesting] = useState(false);

  const toast = useToast();
  const confirm = useConfirm();
  const utils = api.useUtils();

  const handleSuggest = async () => {
    if (!form.title.trim() || !form.amount) {
      toast("error", "Type a title and amount first.");
      return;
    }
    setSuggesting(true);
    try {
      const res = await utils.ai.suggestCategory.fetch({
        title: form.title,
        amount: Number(form.amount) || 0,
        kind: "expense",
      });
      setForm((f) => ({ ...f, category: res.category }));
      toast("success", `Suggested category: ${res.category}`);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to suggest category.");
    } finally {
      setSuggesting(false);
    }
  };

  const { data, isLoading } = api.expenses.list.useQuery({ q: debouncedQ, page }, { staleTime: 30_000 });

  const create = api.expenses.create.useMutation({
    onSuccess: () => {
      toast("success", "Expense recorded.");
      closeModal();
      void utils.expenses.list.invalidate();
      void utils.dashboard.overview.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const update = api.expenses.update.useMutation({
    onSuccess: () => {
      toast("success", "Expense updated.");
      closeModal();
      void utils.expenses.list.invalidate();
      void utils.dashboard.overview.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const remove = api.expenses.remove.useMutation({
    onSuccess: () => {
      toast("success", "Expense deleted.");
      void utils.expenses.list.invalidate();
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
      amount: String(row.amount),
      category: row.category ?? "",
      paidOn: toDateInput(row.paidOn),
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
      title: form.title,
      amount: Number(form.amount) || 0,
      category: form.category || null,
      paidOn: form.paidOn || null,
      notes: form.notes || null,
    };
    if (editing) update.mutate({ id: editing.id, ...payload });
    else create.mutate(payload);
  };

  const handleDelete = async (row: Row) => {
    const ok = await confirm({
      title: "Delete expense",
      message: `Permanently delete "${row.title}"? This cannot be undone.`,
    });
    if (ok) remove.mutate({ id: row.id });
  };

  const exportRows = useMemo(
    () =>
      data?.rows.map((r) => ({
        title: r.title,
        amount: moneyAmount(r.amount),
        category: r.category ?? "",
        paidOn: fmtDate(r.paidOn),
        notes: r.notes ?? "",
      })) ?? [],
    [data],
  );

  const doExport = (format: "csv" | "xls") => {
    const headers = ["Title", "Amount", "Category", "Date", "Notes"];
    if (format === "csv") downloadCsv("expenses.csv", headers, exportRows);
    else downloadXls("expenses.xls", headers, exportRows, "Expenses");
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Expenses</h2>
            <p className="mt-0.5 text-xs text-slate-400">{data?.total ?? 0} records</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input w-52 py-1.5 pl-10"
                placeholder="Search expenses…"
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
              <Plus className="h-4 w-4" /> New expense
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
          <EmptyState icon={ReceiptText} title="No expenses recorded" description="Record your first expense or adjust your search." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.rows.map((row) => (
              <div key={row.id} className="card flex flex-col transition hover:shadow-md">
                <div className="flex items-start justify-between gap-2 p-4 pb-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                      <ReceiptText className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900 dark:text-white">{row.title}</span>
                      <span className="block text-xs text-slate-400">{fmtDate(row.paidOn)}</span>
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
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{money(row.amount, currency)}</div>
                  {row.notes ? <p className="mt-1 line-clamp-2 text-xs text-slate-400">{row.notes}</p> : null}
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
                  {row.category ? (
                    <span className="badge bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300">{row.category}</span>
                  ) : (
                    <span className="text-xs text-slate-300 dark:text-slate-600">Uncategorized</span>
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
        title={editing ? "Edit expense" : "New expense"}
        icon={<ReceiptText className="h-5 w-5 text-brand-600" />}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="expense-form"
              className="btn btn-primary"
              disabled={create.isPending || update.isPending}
            >
              Save expense
            </button>
          </>
        }
      >
        <form id="expense-form" onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Groceries"
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
              <label className="label">Date</label>
              <input
                className="input"
                type="date"
                value={form.paidOn}
                onChange={(e) => setForm({ ...form, paidOn: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Category</label>
            <div className="flex gap-2">
              <input
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Food, Transport, Bills"
                maxLength={60}
              />
              <button
                type="button"
                className="btn btn-secondary shrink-0 px-3"
                onClick={() => void handleSuggest()}
                disabled={suggesting}
                title="Suggest category with AI"
              >
                {suggesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Suggest
              </button>
            </div>
          </div>
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
