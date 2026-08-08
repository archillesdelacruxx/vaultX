"use client";

import {
  Copy,
  Eye,
  EyeOff,
  FileDown,
  FileSpreadsheet,
  LifeBuoy,
  Pencil,
  Phone,
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
import { newClientId, type LocalRecord } from "~/lib/db/db";
import { useLocalEntity } from "~/lib/db/use-local-entity";

import { VaultPinModal } from "~/components/vault/vault-pin-modal";
import { useVaultLock } from "~/components/vault/use-vault-lock";
import { ActionSpinner, LoadingOverlay } from "~/components/ui/action-spinner";

interface RowData extends LocalRecord {
  category?: string | null;
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  created_at?: Date | null;
}

type Row = RowData;

const EMPTY_FORM = { category: "", name: "", phone: "", address: "", notes: "" };

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

const CATEGORY_COLORS: Record<string, string> = {
  family: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300",
  medical: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  police: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  contact: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
};

export default function EmergencyPage() {
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
  const { showPinModal, requestUnlock, handleSuccess } = useVaultLock();

  const { rows, isLoading, upsert, remove } = useLocalEntity("emergency");

  const PAGE_SIZE = 12;

  const list = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase();
    const filtered = (rows as Row[]).filter((r) => {
      if (!needle) return true;
      const name = String(r.name ?? "").toLowerCase();
      const category = String(r.category ?? "").toLowerCase();
      const phone = String(r.phone ?? "").toLowerCase();
      return (
        name.includes(needle) ||
        category.includes(needle) ||
        phone.includes(needle)
      );
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
        category: row.category ?? "",
        name: row.name,
        phone: row.phone ?? "",
        address: row.address ?? "",
        notes: row.notes ?? "",
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
        toast("success", "Contact updated.");
      } else {
        await upsert(
          {
            clientId: newClientId(),
            id: null,
            category: null,
            name: "",
            phone: null,
            address: null,
            notes: null,
            updated_at: new Date(),
            created_at: null,
          },
          { ...form },
        );
        toast("success", "Contact saved.");
      }
      closeModal();
    } catch (err: unknown) {
      toast("error", err instanceof Error ? err.message : "Could not save contact.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: Row) => {
    const ok = await confirm({
      title: "Delete contact",
      message: `Permanently delete "${row.name}"? This cannot be undone.`,
    });
    if (!ok) return;
    try {
      await remove(row);
      toast("success", "Contact deleted.");
    } catch (err: unknown) {
      toast("error", err instanceof Error ? err.message : "Could not delete contact.");
    }
  };

  const exportRows = useMemo(
    () =>
      (rows as Row[]).map((r) => ({
        category: r.category ?? "",
        name: r.name,
        phone: r.phone ?? "",
        address: r.address ?? "",
        notes: r.notes ?? "",
      })),
    [rows],
  );

  const doExport = (format: "csv" | "xls") => {
    const headers = ["Category", "Name", "Phone", "Address", "Notes"];
    if (format === "csv") downloadCsv("emergency.csv", headers, exportRows);
    else downloadXls("emergency.xls", headers, exportRows, "Emergency Contacts");
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Emergency Contacts</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {list.total} contacts · always at hand
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input w-52 py-1.5 pl-10"
                placeholder="Search contacts…"
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
              <Plus className="h-4 w-4" /> New contact
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
          <EmptyState
            icon={LifeBuoy}
            title="No emergency contacts"
            description="Save your first contact or adjust your search."
          />
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
                        <LifeBuoy className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900 dark:text-white">{row.name}</span>
                        <span className="block truncate text-xs text-slate-400">{row.category ?? "Contact"}</span>
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
                    <div className="flex items-center gap-2">
                      <span className="truncate font-mono text-sm text-slate-800 dark:text-slate-200">
                        {isRevealed ? row.phone ?? "No number" : "••••••••••"}
                      </span>
                      {row.phone ? (
                        <button
                          type="button"
                          className="icon-btn shrink-0"
                          title={isRevealed ? "Hide number" : "Show number"}
                          onClick={() => setRevealed((r) => ({ ...r, [String(row.id)]: !isRevealed }))}
                        >
                          {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      ) : null}
                    </div>
                    {row.address ? <p className="mt-1.5 truncate text-xs text-slate-400">{row.address}</p> : null}
                    {row.notes ? <p className="mt-1.5 line-clamp-2 text-xs text-slate-400">{row.notes}</p> : null}
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
                    {row.category ? (
                      <span className={`badge ${CATEGORY_COLORS[row.category.toLowerCase()] ?? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                        {row.category}
                      </span>
                    ) : (
                      <span />
                    )}
                    <div className="flex items-center gap-0.5">
                      <CopyButton value={row.phone ?? ""} title="Copy number" />
                      {row.phone ? (
                        <a
                          href={`tel:${row.phone.replace(/[^+\d]/g, "")}`}
                          className="icon-btn"
                          title="Call"
                        >
                          <Phone className="h-4 w-4 text-emerald-600" />
                        </a>
                      ) : null}
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
        title={editing ? "Edit contact" : "New contact"}
        icon={<LifeBuoy className="h-5 w-5 text-brand-600" />}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button
              type="submit"
              form="emergency-form"
              className="btn btn-primary min-w-[110px]"
              disabled={saving}
            >
              {saving ? <ActionSpinner className="mr-1.5" /> : null}
              {saving ? "Saving..." : "Save contact"}
            </button>
          </>
        }
      >
        <div className="relative">
          <LoadingOverlay visible={saving} text="Saving contact to vault..." />
          <form id="emergency-form" onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Mom"
                required
                maxLength={190}
              />
            </div>
            <div>
              <label className="label">Category</label>
              <input
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. family, medical, police"
                maxLength={60}
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="e.g. 0917 123 4567"
                maxLength={40}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="label">Address</label>
              <input
                className="input"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                maxLength={255}
              />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                className="input"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. Blood type, allergies…"
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

