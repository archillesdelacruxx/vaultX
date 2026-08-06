"use client";

import {
  FileDown,
  FileSpreadsheet,
  Pencil,
  Pin,
  Plus,
  Search,
  StickyNote,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Modal } from "~/components/ui/modal";
import { PaginationBar } from "~/components/ui/pagination";
import { EmptyState } from "~/components/ui/primitives";
import { useConfirm } from "~/components/ui/confirm";
import { useToast } from "~/components/ui/toast";
import { VaultPinModal } from "~/components/vault/vault-pin-modal";
import { useVaultLock } from "~/components/vault/use-vault-lock";
import { ActionSpinner, LoadingOverlay } from "~/components/ui/action-spinner";

type Note = RouterOutputs["notes"]["list"]["rows"][number];

export default function NotesPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [form, setForm] = useState({ title: "", content: "", category: "", pinned: false });

  const toast = useToast();
  const confirm = useConfirm();
  const { isUnlocked, showPinModal, requestUnlock, handleSuccess } = useVaultLock();

  const utils = api.useUtils();
  const { data, isLoading } = api.notes.list.useQuery(
    { q: debouncedQ, page },
    { staleTime: 30_000 },
  );

  const create = api.notes.create.useMutation({
    onSuccess: () => {
      toast("success", "Note created.");
      closeModal();
      void utils.notes.list.invalidate();
      void utils.dashboard.overview.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const update = api.notes.update.useMutation({
    onSuccess: () => {
      toast("success", "Note updated.");
      closeModal();
      void utils.notes.list.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const remove = api.notes.remove.useMutation({
    onSuccess: () => {
      toast("success", "Note deleted.");
      void utils.notes.list.invalidate();
      void utils.dashboard.overview.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const search = () => {
    setPage(1);
    setDebouncedQ(q.trim());
  };

  const openNew = () => {
    requestUnlock(() => {
      setEditing(null);
      setForm({ title: "", content: "", category: "", pinned: false });
      setModalOpen(true);
    });
  };

  const openEdit = (note: Note) => {
    requestUnlock(() => {
      setEditing(note);
      setForm({
        title: note.title,
        content: note.content,
        category: note.category ?? "",
        pinned: note.pinned,
      });
      setModalOpen(true);
    });
  };


  const closeModal = () => setModalOpen(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      update.mutate({ id: editing.id, ...form });
    } else {
      create.mutate(form);
    }
  };

  const handleDelete = async (note: Note) => {
    const ok = await confirm({
      title: "Delete note",
      message: `Permanently delete "${note.title}"? This cannot be undone.`,
    });
    if (ok) remove.mutate({ id: note.id });
  };

  const exportRows = useMemo(() => {
    return (
      data?.rows.map((n) => ({
        title: n.title,
        category: n.category ?? "",
        pinned: n.pinned ? "Yes" : "No",
        content: n.content,
        updated: fmtDate(n.updated_at),
      })) ?? []
    );
  }, [data]);

  const doExport = (format: "csv" | "xls") => {
    const headers = ["Title", "Category", "Pinned", "Content", "Updated"];
    const filename = "notes";
    if (format === "csv") downloadCsv(`${filename}.csv`, headers, exportRows);
    else downloadXls(`${filename}.xls`, headers, exportRows, "Secure Notes");
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Secure Notes</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {data?.total ?? 0} notes · stored in your encrypted vault
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input w-52 py-1.5 pl-10"
                placeholder="Search notes…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
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
              <Plus className="h-4 w-4" /> New note
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
          <EmptyState
            icon={StickyNote}
            title="No notes found"
            description="Create your first note or adjust your search."
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.rows.map((note) => (
              <div key={note.id} className="card flex flex-col transition hover:shadow-md">
                <div className="flex items-start justify-between gap-2 p-4 pb-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                      <StickyNote className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900 dark:text-white">
                        {note.title}
                      </span>
                      <span className="block text-xs text-slate-400">{fmtDate(note.updated_at)}</span>
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {note.pinned ? (
                      <span className="icon-btn" title="Pinned">
                        <Pin className="h-4 w-4 text-brand-600" />
                      </span>
                    ) : null}
                    <button type="button" className="icon-btn" title="Edit" onClick={() => openEdit(note)}>
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" className="icon-btn" title="Delete" onClick={() => handleDelete(note)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 px-4 pb-4">
                  <p className="line-clamp-5 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
                    {note.content || "No content yet."}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
                  {note.category ? (
                    <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                      {note.category}
                    </span>
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
        title={editing ? "Edit note" : "New note"}
        icon={<StickyNote className="h-5 w-5 text-brand-600" />}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={create.isPending || update.isPending}>
              Cancel
            </button>
            <button type="submit" form="note-form" className="btn btn-primary min-w-[110px]" disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending ? <ActionSpinner className="mr-1.5" /> : null}
              {create.isPending || update.isPending ? "Saving..." : "Save note"}
            </button>
          </>
        }
      >
        <div className="relative">
          <LoadingOverlay visible={create.isPending || update.isPending} text="Saving note to vault..." />
          <form id="note-form" onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Title</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Server config"
                required
                maxLength={190}
              />
            </div>
            <div>
              <label className="label">Content</label>
              <textarea
                className="input"
                rows={5}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Write something worth keeping…"
              />
            </div>
            <div>
              <label className="label">Category</label>
              <input
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Personal, Work, Finance"
                maxLength={60}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600"
                checked={form.pinned}
                onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
              />
              Pin to top
            </label>
          </form>
        </div>
      </Modal>

      <VaultPinModal open={showPinModal} onSuccess={handleSuccess} />
    </div>
  );
}

