"use client";

import {
  FileDown,
  FileSpreadsheet,
  NotebookPen,
  Pencil,
  Plus,
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
import { fmtDate, toDateInput } from "~/server/lib/format";
import { api, type RouterOutputs } from "~/trpc/react";

type Row = RouterOutputs["journal"]["list"]["rows"][number];

const EMPTY_FORM = { title: "", body: "", mood: "", entryDate: "" };

const MOOD_EMOJI: Record<string, string> = {
  happy: "😄",
  good: "🙂",
  neutral: "😐",
  sad: "😔",
  anxious: "😟",
  angry: "😠",
};

export default function JournalPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const toast = useToast();
  const confirm = useConfirm();
  const utils = api.useUtils();

  const { data, isLoading } = api.journal.list.useQuery({ q: debouncedQ, page }, { staleTime: 30_000 });

  const create = api.journal.create.useMutation({
    onSuccess: () => {
      toast("success", "Entry saved.");
      closeModal();
      void utils.journal.list.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const update = api.journal.update.useMutation({
    onSuccess: () => {
      toast("success", "Entry updated.");
      closeModal();
      void utils.journal.list.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const remove = api.journal.remove.useMutation({
    onSuccess: () => {
      toast("success", "Entry deleted.");
      void utils.journal.list.invalidate();
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
      title: row.title ?? "",
      body: row.body,
      mood: row.mood ?? "",
      entryDate: toDateInput(row.entryDate),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, title: form.title || null, mood: form.mood || null, entryDate: form.entryDate || null };
    if (editing) update.mutate({ id: editing.id, ...payload });
    else create.mutate(payload);
  };

  const handleDelete = async (row: Row) => {
    const ok = await confirm({
      title: "Delete entry",
      message: `Permanently delete this entry? This cannot be undone.`,
    });
    if (ok) remove.mutate({ id: row.id });
  };

  const exportRows = useMemo(
    () =>
      data?.rows.map((r) => ({
        date: fmtDate(r.entryDate),
        title: r.title ?? "",
        mood: r.mood ?? "",
        body: r.body,
      })) ?? [],
    [data],
  );

  const doExport = (format: "csv" | "xls") => {
    const headers = ["Date", "Title", "Mood", "Entry"];
    if (format === "csv") downloadCsv("journal.csv", headers, exportRows);
    else downloadXls("journal.xls", headers, exportRows, "Journal");
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Journal</h2>
            <p className="mt-0.5 text-xs text-slate-400">{data?.total ?? 0} entries</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input w-52 py-1.5 pl-10"
                placeholder="Search journal…"
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
              <Plus className="h-4 w-4" /> New entry
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card h-48 animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={NotebookPen} title="No journal entries" description="Write your first entry or adjust your search." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.rows.map((row) => (
              <div key={row.id} className="card flex flex-col transition hover:shadow-md">
                <div className="flex items-start justify-between gap-2 p-4 pb-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                      <NotebookPen className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900 dark:text-white">
                        {row.title ?? "Untitled"}
                      </span>
                      <span className="block text-xs text-slate-400">{fmtDate(row.entryDate)}</span>
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
                  <p className="line-clamp-6 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{row.body}</p>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
                  {row.mood ? (
                    <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                      {MOOD_EMOJI[row.mood] ?? ""} {row.mood}
                    </span>
                  ) : (
                    <span />
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
        title={editing ? "Edit entry" : "New entry"}
        icon={<NotebookPen className="h-5 w-5 text-brand-600" />}
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="journal-form"
              className="btn btn-primary"
              disabled={create.isPending || update.isPending}
            >
              Save entry
            </button>
          </>
        }
      >
        <form id="journal-form" onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Title</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={190}
              />
            </div>
            <div>
              <label className="label">Mood</label>
              <select className="input" value={form.mood} onChange={(e) => setForm({ ...form, mood: e.target.value })}>
                <option value="">None</option>
                <option value="happy">Happy</option>
                <option value="good">Good</option>
                <option value="neutral">Neutral</option>
                <option value="sad">Sad</option>
                <option value="anxious">Anxious</option>
                <option value="angry">Angry</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Date</label>
            <input
              className="input"
              type="date"
              value={form.entryDate}
              onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Entry</label>
            <textarea
              className="input"
              rows={10}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="How was your day?"
              required
              maxLength={50000}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
