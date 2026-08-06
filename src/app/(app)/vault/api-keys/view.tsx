"use client";

import {
  Copy,
  Eye,
  EyeOff,
  FileKey2,
  FileDown,
  FileSpreadsheet,
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
import { fmtDate } from "~/server/lib/format";
import { api, type RouterOutputs } from "~/trpc/react";

import { VaultPinModal } from "~/components/vault/vault-pin-modal";
import { useVaultLock } from "~/components/vault/use-vault-lock";
import { ActionSpinner, LoadingOverlay } from "~/components/ui/action-spinner";

type Row = RouterOutputs["apiKeys"]["list"]["rows"][number];

const EMPTY_FORM = { name: "", apiKey: "", provider: "", scopes: "", notes: "" };

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

export default function ApiKeysPage() {
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
  const { isUnlocked, showPinModal, requestUnlock, handleSuccess } = useVaultLock();

  const { data, isLoading } = api.apiKeys.list.useQuery({ q: debouncedQ, page }, { staleTime: 30_000 });

  const create = api.apiKeys.create.useMutation({
    onSuccess: () => {
      toast("success", "API key saved.");
      closeModal();
      void utils.apiKeys.list.invalidate();
      void utils.dashboard.overview.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const update = api.apiKeys.update.useMutation({
    onSuccess: () => {
      toast("success", "API key updated.");
      closeModal();
      void utils.apiKeys.list.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const remove = api.apiKeys.remove.useMutation({
    onSuccess: () => {
      toast("success", "API key deleted.");
      void utils.apiKeys.list.invalidate();
      void utils.dashboard.overview.invalidate();
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
        name: row.name,
        apiKey: row.apiKey,
        provider: row.provider ?? "",
        scopes: row.scopes ?? "",
        notes: row.notes ?? "",
      });
      setModalOpen(true);
    });
  };

  const toggleRevealKey = (id: number) => {
    requestUnlock(() => {
      setRevealed((r) => ({ ...r, [id]: !r[id] }));
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
      title: "Delete API key",
      message: `Permanently delete "${row.name}"? This cannot be undone.`,
    });
    if (ok) remove.mutate({ id: row.id });
  };

  const exportRows = useMemo(
    () =>
      data?.rows.map((r) => ({
        name: r.name,
        provider: r.provider ?? "",
        scopes: r.scopes ?? "",
        notes: r.notes ?? "",
        updated: fmtDate(r.updated_at),
      })) ?? [],
    [data],
  );

  const doExport = (format: "csv" | "xls") => {
    const headers = ["Name", "Provider", "Scopes", "Notes", "Updated"];
    if (format === "csv") downloadCsv("api-keys.csv", headers, exportRows);
    else downloadXls("api-keys.xls", headers, exportRows, "API Keys");
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">API Keys</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {data?.total ?? 0} saved · encrypted at rest
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input w-52 py-1.5 pl-10"
                placeholder="Search API keys…"
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
              <Plus className="h-4 w-4" /> New key
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
            icon={FileKey2}
            title="No API keys found"
            description="Save your first API key or adjust your search."
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
                        <FileKey2 className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-900 dark:text-white">{row.name}</span>
                        <span className="block truncate text-xs text-slate-400">{row.provider ?? "No provider"}</span>
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
                      {isRevealed ? row.apiKey : "••••••••••••••••"}
                    </span>
                    {row.scopes ? (
                      <span className="mt-1.5 inline-block max-w-full truncate rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {row.scopes}
                      </span>
                    ) : null}
                    {row.notes ? (
                      <p className="mt-2 line-clamp-2 text-xs text-slate-400">{row.notes}</p>
                    ) : null}
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-slate-100 px-4 py-2.5 dark:border-slate-800">
                    <span className="text-[11px] text-slate-400">Updated {fmtDate(row.updated_at)}</span>
                    <div className="flex items-center gap-0.5">
                      <CopyButton value={row.apiKey} title="Copy key" />
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
          {data ? <PaginationBar page={data.page} pages={data.pages} total={data.total} onChange={setPage} /> : null}
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit API key" : "New API key"}
        icon={<FileKey2 className="h-5 w-5 text-brand-600" />}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={create.isPending || update.isPending}>
              Cancel
            </button>
            <button
              type="submit"
              form="apikey-form"
              className="btn btn-primary min-w-[110px]"
              disabled={create.isPending || update.isPending}
            >
              {create.isPending || update.isPending ? <ActionSpinner className="mr-1.5" /> : null}
              {create.isPending || update.isPending ? "Saving..." : "Save key"}
            </button>
          </>
        }
      >
        <div className="relative">
          <LoadingOverlay visible={create.isPending || update.isPending} text="Saving API key to vault..." />
          <form id="apikey-form" onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. OpenAI production"
                required
                maxLength={190}
              />
            </div>
            <div>
              <label className="label">API key</label>
              <input
                className="input"
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder="sk-…"
                required
                maxLength={500}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="label">Provider</label>
              <input
                className="input"
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                placeholder="e.g. OpenAI, AWS, Stripe"
                maxLength={100}
              />
            </div>
            <div>
              <label className="label">Scopes</label>
              <input
                className="input"
                value={form.scopes}
                onChange={(e) => setForm({ ...form, scopes: e.target.value })}
                placeholder="e.g. read, write, billing"
                maxLength={190}
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

