"use client";

import {
  ExternalLink,
  FileArchive,
  FileDown,
  FileSpreadsheet,
  FileText,
  FileType2,
  FolderLock,
  ImageIcon,
  Pencil,
  Plus,
  Search,
  Trash2,
  Video,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Modal } from "~/components/ui/modal";
import { PaginationBar } from "~/components/ui/pagination";
import { EmptyState, StatCard } from "~/components/ui/primitives";
import { useConfirm } from "~/components/ui/confirm";
import { useToast } from "~/components/ui/toast";
import { downloadCsv, downloadXls } from "~/lib/export";
import { getPreviewUrl } from "~/lib/preview";
import { cn } from "~/lib/cn";
import { fmtDate, humanSize } from "~/server/lib/format";
import { api, type RouterOutputs } from "~/trpc/react";

type Row = RouterOutputs["documents"]["list"]["rows"][number];

const EMPTY_FORM = { name: "", filePath: "", fileType: "", fileSize: "0", description: "" };

const FILE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  pdf: FileText,
  image: ImageIcon,
  photo: ImageIcon,
  picture: ImageIcon,
  jpg: ImageIcon,
  jpeg: ImageIcon,
  png: ImageIcon,
  gif: ImageIcon,
  webp: ImageIcon,
  svg: ImageIcon,
  doc: FileType2,
  docx: FileType2,
  txt: FileType2,
  sheet: FileSpreadsheet,
  spreadsheet: FileSpreadsheet,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  zip: FileArchive,
  rar: FileArchive,
  video: Video,
  mp4: Video,
  mov: Video,
  movie: Video,
};

const FILE_STYLE: Record<string, string> = {
  pdf: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  image: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  photo: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  picture: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  doc: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
  docx: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400",
  txt: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  sheet: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  spreadsheet: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  zip: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  rar: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  video: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
  mp4: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
};

const DEFAULT_STYLE = "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400";

function fileKey(fileType: string | null | undefined): string {
  return String(fileType ?? "").trim().toLowerCase().replace(/^\./, "");
}

export default function DocumentsPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const toast = useToast();
  const confirm = useConfirm();
  const utils = api.useUtils();

  const { data, isLoading } = api.documents.list.useQuery({ q: debouncedQ, page }, { staleTime: 30_000 });

  const create = api.documents.create.useMutation({
    onSuccess: () => {
      toast("success", "Document saved.");
      closeModal();
      void utils.documents.list.invalidate();
      void utils.dashboard.overview.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const update = api.documents.update.useMutation({
    onSuccess: () => {
      toast("success", "Document updated.");
      closeModal();
      void utils.documents.list.invalidate();
      void utils.dashboard.overview.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const remove = api.documents.remove.useMutation({
    onSuccess: () => {
      toast("success", "Document deleted.");
      void utils.documents.list.invalidate();
      void utils.dashboard.overview.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const stats = useMemo(() => {
    const rows = data?.rows ?? [];
    const totalBytes = rows.reduce((sum, r) => sum + Number(r.fileSize), 0);
    const withPreview = rows.filter((r) => getPreviewUrl(r.filePath ?? "")).length;
    return { totalBytes, withPreview };
  }, [data]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditing(row);
    setForm({
      name: row.name,
      filePath: row.filePath ?? "",
      fileType: row.fileType ?? "",
      fileSize: String(row.fileSize),
      description: row.description ?? "",
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
      filePath: form.filePath || null,
      fileType: form.fileType || null,
      fileSize: Number(form.fileSize) || 0,
      description: form.description || null,
    };
    if (editing) update.mutate({ id: editing.id, ...payload });
    else create.mutate(payload);
  };

  const handleDelete = async (row: Row) => {
    const ok = await confirm({
      title: "Delete document",
      message: `Permanently delete "${row.name}"? This cannot be undone.`,
    });
    if (ok) remove.mutate({ id: row.id });
  };

  const exportRows = useMemo(
    () =>
      data?.rows.map((r) => ({
        name: r.name,
        type: r.fileType ?? "",
        size: humanSize(r.fileSize),
        description: r.description ?? "",
        added: fmtDate(r.created_at),
      })) ?? [],
    [data],
  );

  const doExport = (format: "csv" | "xls") => {
    const headers = ["Name", "Type", "Size", "Description", "Added"];
    if (format === "csv") downloadCsv("documents.csv", headers, exportRows);
    else downloadXls("documents.xls", headers, exportRows, "Documents");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Documents stored" value={String(data?.total ?? 0)} icon={FolderLock} tone="brand" />
        <StatCard label="Total size" value={humanSize(stats.totalBytes)} icon={FileDown} tone="amber" />
        <StatCard label="With preview" value={String(stats.withPreview)} icon={ImageIcon} tone="green" />
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <FolderLock className="h-4 w-4 text-brand-600" />
              Documents
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">{data?.total ?? 0} documents</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input w-52 py-1.5 pl-10"
                placeholder="Search documents…"
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
              <Plus className="h-4 w-4" /> New document
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card h-40 animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={FolderLock} title="No documents" description="Add your first document or adjust your search." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.rows.map((row) => {
              const key = fileKey(row.fileType);
              const Icon = FILE_ICON[key] ?? FolderLock;
              const preview = getPreviewUrl(row.filePath ?? "");
              return (
                <div key={row.id} className="card group flex flex-col overflow-hidden transition hover:shadow-md">
                  {preview ? (
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt={row.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.parentElement?.remove();
                        }}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
                      <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
                        <span className="rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 backdrop-blur">
                          {row.fileType ?? "File"}
                        </span>
                        <span className="rounded-md bg-slate-950/50 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                          {humanSize(row.fileSize)}
                        </span>
                      </div>
                    </div>
                  ) : null}
                  <div className="flex items-start justify-between gap-2 p-4 pb-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                          FILE_STYLE[key] ?? DEFAULT_STYLE,
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900 dark:text-white">{row.name}</span>
                        <span className="block text-xs text-slate-400">
                          {row.fileType ?? "File"} · {humanSize(row.fileSize)}
                        </span>
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition group-hover:opacity-100">
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
                    ) : (
                      <p className="text-xs text-slate-300 dark:text-slate-600">No description</p>
                    )}
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400">Added {fmtDate(row.created_at)}</span>
                    {row.filePath ? (
                      <a
                        href={row.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Open
                      </a>
                    ) : null}
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
        title={editing ? "Edit document" : "New document"}
        icon={<FolderLock className="h-5 w-5 text-brand-600" />}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button
              type="submit"
              form="doc-form"
              className="btn btn-primary"
              disabled={create.isPending || update.isPending}
            >
              Save document
            </button>
          </>
        }
      >
        <form id="doc-form" onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Birth certificate"
              required
              maxLength={255}
            />
          </div>
          <div>
            <label className="label">Link / path</label>
            <input
              className="input"
              value={form.filePath}
              onChange={(e) => setForm({ ...form, filePath: e.target.value })}
              placeholder="https://drive.google.com/… or /files/id.pdf"
              maxLength={500}
            />
            {getPreviewUrl(form.filePath) ? (
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getPreviewUrl(form.filePath) ?? ""}
                  alt="Preview"
                  className="max-h-48 w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">File type</label>
              <input
                className="input"
                value={form.fileType}
                onChange={(e) => setForm({ ...form, fileType: e.target.value })}
                placeholder="e.g. PDF, Image"
                maxLength={100}
              />
            </div>
            <div>
              <label className="label">Size (bytes)</label>
              <input
                className="input"
                type="number"
                min={0}
                value={form.fileSize}
                onChange={(e) => setForm({ ...form, fileSize: e.target.value })}
              />
            </div>
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
        </form>
      </Modal>
    </div>
  );
}
