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

import { ActionSpinner, LoadingOverlay } from "~/components/ui/action-spinner";
import { useConfirm } from "~/components/ui/confirm";
import { Modal } from "~/components/ui/modal";
import { PaginationBar } from "~/components/ui/pagination";
import { EmptyState } from "~/components/ui/primitives";
import { useToast } from "~/components/ui/toast";
import { downloadCsv, downloadXls } from "~/lib/export";
import { fmtDate } from "~/server/lib/format";
import { api } from "~/trpc/react";
import { newClientId, type LocalRecord } from "~/lib/db/db";
import { useLocalEntity } from "~/lib/db/use-local-entity";
import { VaultPinModal } from "~/components/vault/vault-pin-modal";
import { useVaultLock } from "~/components/vault/use-vault-lock";

interface NoteData extends LocalRecord {
  title: string;
  content?: string | null;
  category?: string | null;
  pinned?: boolean;
  created_at?: Date | null;
}

type Note = NoteData;


export default function NotesPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [form, setForm] = useState({ title: "", content: "", category: "", pinned: false });
  const [saving, setSaving] = useState(false);

  const confirm = useConfirm();
  const toast = useToast();
  const { showPinModal, requestUnlock, handleSuccess } = useVaultLock();

  const utils = api.useUtils();
  const { rows, isLoading, upsert, remove } = useLocalEntity("notes");

  const PAGE_SIZE = 12;

  const list = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase();
    const filtered = (rows as Note[]).filter((n) => {
      if (!needle) return true;
      const title = String(n.title ?? "").toLowerCase();
      const content = String(n.content ?? "").toLowerCase();
      return title.includes(needle) || content.includes(needle);
    });
    filtered.sort((a, b) => Number(b.pinned ?? false) - Number(a.pinned ?? false));
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pages);
    const start = (safePage - 1) * PAGE_SIZE;
    return {
      rows: filtered.slice(start, start + PAGE_SIZE),
      total: filtered.length,
      pages,
      page: safePage,
    };
  }, [rows, debouncedQ, page]);

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
        content: note.content ?? "",
        category: note.category ?? "",
        pinned: !!note.pinned,
      });
      setModalOpen(true);
    });
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await upsert(editing, { ...form });
        toast("success", "Note updated.");
      } else {
        await upsert(
          {
            clientId: newClientId(),
            id: null,
            title: "",
            content: null,
            category: null,
            pinned: false,
            updated_at: new Date(),
            created_at: null,
          },
          { ...form },
        );
        toast("success", "Note saved.");
      }
      if (typeof navigator !== "undefined" && navigator.onLine) {
        void utils.dashboard.overview.invalidate();
      }
      closeModal();
    } catch (err: unknown) {
      toast("error", err instanceof Error ? err.message : "Could not save note.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (note: Note) => {
    const ok = await confirm({
      title: "Delete note",
      message: `Permanently delete "${note.title}"? This cannot be undone.`,
    });
    if (!ok) return;
    try {
      await remove(note);
      toast("success", "Note deleted.");
      if (typeof navigator !== "undefined" && navigator.onLine) {
        void utils.dashboard.overview.invalidate();
      }
    } catch (err: unknown) {
      toast("error", err instanceof Error ? err.message : "Could not delete note.");
    }
  };

  const exportRows = useMemo(() => {
    return (rows as Note[]).map((n) => ({
      title: n.title,
      category: n.category ?? "",
      pinned: n.pinned ? "Yes" : "No",
      content: n.content ?? "",
      updated: fmtDate(n.updated_at),
    }));
  }, [rows]);

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
              {list.total} notes · stored in your encrypted vault
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
      ) : list.rows.length === 0 ? (
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
            {list.rows.map((note) => (
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
                    {note.content ?? "No content yet."}
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
          {list.rows.length > 0 ? (
            <PaginationBar page={list.page} pages={list.pages} total={list.total} onChange={setPage} />
          ) : null}
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit note" : "New note"}
        icon={<StickyNote className="h-5 w-5 text-brand-600" />}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="note-form" className="btn btn-primary min-w-[110px]" disabled={saving}>
              {saving ? <ActionSpinner className="mr-1.5" /> : null}
              {saving ? "Saving..." : "Save note"}
            </button>
          </>
        }
      >
        <div className="relative">
          <LoadingOverlay visible={saving} text="Saving note to vault..." />
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

