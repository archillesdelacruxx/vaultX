"use client";

import {
  Copy,
  Eye,
  EyeOff,
  FileDown,
  FileSpreadsheet,
  FileText,
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
import { api } from "~/trpc/react";
import { newClientId, type LocalRecord } from "~/lib/db/db";
import { useLocalEntity } from "~/lib/db/use-local-entity";

import { VaultPinModal } from "~/components/vault/vault-pin-modal";
import { useVaultLock } from "~/components/vault/use-vault-lock";
import { ActionSpinner, LoadingOverlay } from "~/components/ui/action-spinner";

interface RowData extends LocalRecord {
  software: string;
  licenseKey?: string | null;
  licensedTo?: string | null;
  expiry?: string | Date | null;
  notes?: string | null;
  created_at?: Date | null;
}

type Row = RowData;

const EMPTY_FORM = { software: "", licenseKey: "", licensedTo: "", expiry: "", notes: "" };

function CopyButton({ value, title = "Copy" }: { value: string; title?: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      className="icon-btn"
      title={title}
      disabled={!value}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast("success", "Copied to clipboard.");
        } catch {
          toast("error", "Could not copy.");
        }
      }}
    >
      <Copy className="h-4 w-4" />
    </button>
  );
}

export default function LicensesPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const toast = useToast();
  const confirm = useConfirm();
  const utils = api.useUtils();
  const { showPinModal, requestUnlock, handleSuccess } = useVaultLock();

  const { rows, isLoading, upsert, remove } = useLocalEntity("licenses");

  const PAGE_SIZE = 12;

  const list = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase();
    const filtered = (rows as Row[]).filter((r) => {
      if (!needle) return true;
      const software = String(r.software ?? "").toLowerCase();
      const licensedTo = String(r.licensedTo ?? "").toLowerCase();
      return software.includes(needle) || licensedTo.includes(needle);
    });
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

  const openNew = () => {
    requestUnlock(() => {
      setEditing(null);
      setForm(EMPTY_FORM);
      setModalOpen(true);
    });
  };

  const openEdit = (row: Row) => {
    requestUnlock(() => {
      setEditing(row);
      setForm({
        software: row.software,
        licenseKey: row.licenseKey ?? "",
        licensedTo: row.licensedTo ?? "",
        expiry: toDateInput(row.expiry),
        notes: row.notes ?? "",
      });
      setModalOpen(true);
    });
  };

  const toggleRevealKey = (id: number | null) => {
    requestUnlock(() => {
      setRevealed((r) => ({ ...r, [String(id)]: !r[String(id)] }));
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
        toast("success", "License updated.");
      } else {
        await upsert(
          {
            clientId: newClientId(),
            id: null,
            software: "",
            licenseKey: null,
            licensedTo: null,
            expiry: null,
            notes: null,
            updated_at: new Date(),
            created_at: null,
          },
          { ...form },
        );
        toast("success", "License saved.");
      }
      if (typeof navigator !== "undefined" && navigator.onLine) {
        void utils.dashboard.overview.invalidate();
      }
      closeModal();
    } catch (err: unknown) {
      toast("error", err instanceof Error ? err.message : "Could not save license.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: Row) => {
    const ok = await confirm({
      title: "Delete license",
      message: `Permanently delete "${row.software}"? This cannot be undone.`,
    });
    if (!ok) return;
    try {
      await remove(row);
      toast("success", "License deleted.");
      if (typeof navigator !== "undefined" && navigator.onLine) {
        void utils.dashboard.overview.invalidate();
      }
    } catch (err: unknown) {
      toast("error", err instanceof Error ? err.message : "Could not delete license.");
    }
  };

  const exportRows = useMemo(
    () =>
      (rows as Row[]).map((r) => ({
        software: r.software,
        licensedTo: r.licensedTo ?? "",
        expiry: r.expiry ? fmtDate(r.expiry) : "",
        notes: r.notes ?? "",
        updated: fmtDate(r.updated_at),
      })),
    [rows],
  );

  const doExport = (format: "csv" | "xls") => {
    const headers = ["Software", "Licensed to", "Expiry", "Notes", "Updated"];
    if (format === "csv") downloadCsv("licenses.csv", headers, exportRows);
    else downloadXls("licenses.xls", headers, exportRows, "Licenses");
  };

  const expiryBadge = (expiry: string | Date | null | undefined) => {
    if (!expiry) return null;
    const d = new Date(expiry);
    if (Number.isNaN(d.getTime())) return null;
    const diff = d.getTime() - Date.now();
    if (diff < 0) return <span className="badge bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">Expired</span>;
    if (diff < 30 * 86400000)
      return <span className="badge bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">Expiring soon</span>;
    return <span className="badge bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Valid</span>;
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Licenses</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {list.total} saved · encrypted at rest
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input w-52 py-1.5 pl-10"
                placeholder="Search licenses…"
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
              <Plus className="h-4 w-4" /> New license
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
      ) : list.rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={FileText} title="No licenses found" description="Save your first license or adjust your search." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.rows.map((row) => {
              const isRevealed = !!revealed[String(row.id)];
              return (
                <div key={row.id} className="card flex flex-col transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-2 p-4 pb-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                        <FileText className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900 dark:text-white">{row.software}</span>
                        <span className="block truncate text-xs text-slate-400">{row.licensedTo ?? "No licensee"}</span>
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
                    <span className="block truncate font-mono text-sm text-slate-800 dark:text-slate-200">
                      {isRevealed ? row.licenseKey : "••••••••••••••••"}
                    </span>
                    {row.expiry ? (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-slate-400">{fmtDate(row.expiry)}</span>
                        {expiryBadge(row.expiry)}
                      </div>
                    ) : null}
                    {row.notes ? <p className="mt-2 line-clamp-2 text-xs text-slate-400">{row.notes}</p> : null}
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400">Updated {fmtDate(row.updated_at)}</span>
                    <div className="flex items-center gap-0.5">
                      <CopyButton value={row.licenseKey ?? ""} title="Copy key" />
                      <button
                        type="button"
                        className="icon-btn"
                        title={isRevealed ? "Hide key" : "Show key"}
                        onClick={() => toggleRevealKey(row.id)}
                      >
                        {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {list.rows.length > 0 ? (
            <PaginationBar page={list.page} pages={list.pages} total={list.total} onChange={setPage} />
          ) : null}
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit license" : "New license"}
        icon={<FileText className="h-5 w-5 text-brand-600" />}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button
              type="submit"
              form="license-form"
              className="btn btn-primary min-w-[110px]"
              disabled={saving}
            >
              {saving ? <ActionSpinner className="mr-1.5" /> : null}
              {saving ? "Saving..." : "Save license"}
            </button>
          </>
        }
      >
        <div className="relative">
          <LoadingOverlay visible={saving} text="Saving license to vault..." />
          <form id="license-form" onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Software</label>
              <input
                className="input"
                value={form.software}
                onChange={(e) => setForm({ ...form, software: e.target.value })}
                placeholder="e.g. Adobe Photoshop"
                required
                maxLength={190}
              />
            </div>
            <div>
              <label className="label">License key</label>
              <input
                className="input"
                type="password"
                value={form.licenseKey}
                onChange={(e) => setForm({ ...form, licenseKey: e.target.value })}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                required
                maxLength={500}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="label">Licensed to</label>
              <input
                className="input"
                value={form.licensedTo}
                onChange={(e) => setForm({ ...form, licensedTo: e.target.value })}
                placeholder="e.g. you@email.com"
                maxLength={190}
              />
            </div>
            <div>
              <label className="label">Expiry date</label>
              <input
                className="input"
                type="date"
                value={form.expiry}
                onChange={(e) => setForm({ ...form, expiry: e.target.value })}
              />
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
        </div>
      </Modal>

      <VaultPinModal open={showPinModal} onSuccess={handleSuccess} />
    </div>
  );
}

