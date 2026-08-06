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
import { api, type RouterOutputs } from "~/trpc/react";

import { VaultPinModal } from "~/components/vault/vault-pin-modal";
import { useVaultLock } from "~/components/vault/use-vault-lock";
import { ActionSpinner, LoadingOverlay } from "~/components/ui/action-spinner";

type Row = RouterOutputs["emergency"]["list"]["rows"][number];

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
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  const toast = useToast();
  const confirm = useConfirm();
  const utils = api.useUtils();
  const { showPinModal, requestUnlock, handleSuccess } = useVaultLock();

  const { data, isLoading } = api.emergency.list.useQuery({ q: debouncedQ, page }, { staleTime: 30_000 });

  const create = api.emergency.create.useMutation({
    onSuccess: () => {
      toast("success", "Contact saved.");
      closeModal();
      void utils.emergency.list.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const update = api.emergency.update.useMutation({
    onSuccess: () => {
      toast("success", "Contact updated.");
      closeModal();
      void utils.emergency.list.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const remove = api.emergency.remove.useMutation({
    onSuccess: () => {
      toast("success", "Contact deleted.");
      void utils.emergency.list.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

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
        phone: row.phone,
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      update.mutate({ id: editing.id, ...form });
    } else {
      create.mutate(form);
    }
  };

  const handleDelete = async (row: Row) => {
    const ok = await confirm({
      title: "Delete contact",
      message: `Permanently delete "${row.name}"? This cannot be undone.`,
    });
    if (ok) remove.mutate({ id: row.id });
  };

  const exportRows = useMemo(
    () =>
      data?.rows.map((r) => ({
        category: r.category ?? "",
        name: r.name,
        phone: r.phone,
        address: r.address ?? "",
        notes: r.notes ?? "",
      })) ?? [],
    [data],
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
              {data?.total ?? 0} contacts · always at hand
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
      ) : !data || data.rows.length === 0 ? (
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
            {data.rows.map((row) => {
              const isRevealed = !!revealed[row.id];
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
                        {isRevealed ? row.phone || "No number" : "••••••••••"}
                      </span>
                      {row.phone ? (
                        <button
                          type="button"
                          className="icon-btn shrink-0"
                          title={isRevealed ? "Hide number" : "Show number"}
                          onClick={() => setRevealed((r) => ({ ...r, [row.id]: !isRevealed }))}
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
                      <CopyButton value={row.phone} title="Copy number" />
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
          {data ? <PaginationBar page={data.page} pages={data.pages} total={data.total} onChange={setPage} /> : null}
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit contact" : "New contact"}
        icon={<LifeBuoy className="h-5 w-5 text-brand-600" />}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={create.isPending || update.isPending}>
              Cancel
            </button>
            <button
              type="submit"
              form="emergency-form"
              className="btn btn-primary min-w-[110px]"
              disabled={create.isPending || update.isPending}
            >
              {create.isPending || update.isPending ? <ActionSpinner className="mr-1.5" /> : null}
              {create.isPending || update.isPending ? "Saving..." : "Save contact"}
            </button>
          </>
        }
      >
        <div className="relative">
          <LoadingOverlay visible={create.isPending || update.isPending} text="Saving contact to vault..." />
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

