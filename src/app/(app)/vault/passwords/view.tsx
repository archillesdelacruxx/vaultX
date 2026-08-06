"use client";

import {
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  LockKeyhole,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wand2,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

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

type PasswordRow = RouterOutputs["passwords"]["list"]["rows"][number];


const EMPTY_FORM = {
  title: "",
  username: "",
  password: "",
  url: "",
  notes: "",
};

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.split("/")[0]?.split(":")[0] ?? url;
  }
}

function faviconUrl(url: string): string {
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(getDomain(url))}`;
}

function generatePassword(length = 20): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{};:,.<>?";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < length; i++) out += chars[arr[i]! % chars.length];
  return out;
}

function CopyButton({ value, title = "Copy" }: { value: string; title?: string }) {
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast("success", "Copied to clipboard.");
    } catch {
      toast("error", "Could not copy.");
    }
  };
  return (
    <button type="button" className="icon-btn" title={title} onClick={copy} disabled={!value}>
      <Copy className="h-4 w-4" />
    </button>
  );
}

function SiteLogo({ url }: { url: string }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return (
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
        <LockKeyhole className="h-5 w-5" />
      </span>
    );
  }
  return (
    <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      <Image
        src={faviconUrl(url)}
        alt=""
        width={28}
        height={28}
        unoptimized
        onError={() => setBroken(true)}
      />
    </span>
  );
}

export default function PasswordsPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PasswordRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPw, setShowPw] = useState(false);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  const toast = useToast();
  const confirm = useConfirm();

  const utils = api.useUtils();
  const { data, isLoading } = api.passwords.list.useQuery(
    { q: debouncedQ, page },
    { staleTime: 30_000 },
  );

  const editDetail = api.passwords.get.useQuery(
    { id: editing?.id ?? 0 },
    { enabled: editing !== null },
  );

  useEffect(() => {
    if (editing && editDetail.data?.id === editing.id) {
      setForm({
        title: editDetail.data.title,
        username: editDetail.data.username ?? "",
        password: editDetail.data.password ?? "",
        url: editDetail.data.url ?? "",
        notes: editDetail.data.notes ?? "",
      });
      setModalOpen(true);
    }
  }, [editDetail.data, editing]);

  const create = api.passwords.create.useMutation({
    onSuccess: () => {
      toast("success", "Password saved.");
      closeModal();
      void utils.passwords.list.invalidate();
      void utils.dashboard.overview.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const update = api.passwords.update.useMutation({
    onSuccess: () => {
      toast("success", "Password updated.");
      closeModal();
      void utils.passwords.list.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const remove = api.passwords.remove.useMutation({
    onSuccess: () => {
      toast("success", "Password deleted.");
      void utils.passwords.list.invalidate();
      void utils.dashboard.overview.invalidate();
    },
    onError: (e) => toast("error", e.message),
  });

  const search = () => {
    setPage(1);
    setDebouncedQ(q.trim());
  };

  const { isUnlocked, showPinModal, requestUnlock, handleSuccess, lockVault } = useVaultLock();

  const openNew = () => {
    requestUnlock(() => {
      setEditing(null);
      setForm(EMPTY_FORM);
      setShowPw(false);
      setModalOpen(true);
    });
  };

  const openEdit = (row: PasswordRow) => {
    requestUnlock(() => {
      setShowPw(false);
      setEditing(row);
    });
  };

  const toggleReveal = (id: number) => {
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
    const payload = { ...form, password: form.password.trim() };
    if (editing) {
      update.mutate({ id: editing.id, ...payload });
    } else {
      create.mutate(payload);
    }
  };

  const handleDelete = async (row: PasswordRow) => {
    const ok = await confirm({
      title: "Delete password",
      message: `Permanently delete "${row.title}"? This cannot be undone.`,
    });
    if (ok) remove.mutate({ id: row.id });
  };

  const exportRows = useMemo(() => {
    return (
      data?.rows.map((p) => ({
        title: p.title,
        username: p.username ?? "",
        url: p.url ?? "",
        notes: p.notes ?? "",
        updated: fmtDate(p.updated_at),
      })) ?? []
    );
  }, [data]);

  const doExport = (format: "csv" | "xls") => {
    const headers = ["Title", "Username", "URL", "Notes", "Updated"];
    const filename = "passwords";
    if (format === "csv") downloadCsv(`${filename}.csv`, headers, exportRows);
    else downloadXls(`${filename}.xls`, headers, exportRows, "Passwords");
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Passwords</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {data?.total ?? 0} saved · encrypted at rest
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input w-52 py-1.5 pl-10"
                placeholder="Search passwords…"
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
              <Plus className="h-4 w-4" /> New password
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
            icon={LockKeyhole}
            title="No passwords found"
            description="Save your first password or adjust your search."
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.rows.map((row) => {
              const isRevealed = !!revealed[row.id];
              const hasPassword = row.password !== "";
              return (
                <div key={row.id} className="card flex flex-col transition hover:shadow-md">
                  <div className="flex items-center gap-3 p-4 pb-3">
                    <a
                      href={row.url ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={row.url ? `Open ${getDomain(row.url)}` : undefined}
                      className="shrink-0"
                    >
                      <SiteLogo url={row.url ?? ""} />
                    </a>
                    <div className="min-w-0 flex-1">
                      <a
                        href={row.url ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate font-semibold text-slate-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400"
                      >
                        {row.title}
                      </a>
                      <span className="block truncate text-xs text-slate-400">
                        {row.url ? getDomain(row.url) : "No URL"}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <CopyButton value={row.password} title="Copy password" />
                      <button type="button" className="icon-btn" title="Edit" onClick={() => openEdit(row)}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" className="icon-btn" title="Delete" onClick={() => handleDelete(row)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-auto space-y-2 border-t border-slate-100 px-4 py-3 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm text-slate-600 dark:text-slate-300">
                        {row.username ?? "No username"}
                      </span>
                      {row.username ? <CopyButton value={row.username} title="Copy username" /> : null}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-mono text-sm text-slate-800 dark:text-slate-200">
                        {hasPassword
                          ? isRevealed
                            ? row.password
                            : "••••••••••••"
                          : "—"}
                      </span>
                      {hasPassword ? (
                        <button
                          type="button"
                          className="icon-btn shrink-0"
                          title={isRevealed ? "Hide password" : "Show password"}
                          onClick={() => toggleReveal(row.id)}
                        >
                          {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Updated {fmtDate(row.updated_at)}</span>
                      {row.url ? (
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline dark:text-brand-400"
                        >
                          Visit <ExternalLink className="h-3 w-3" />
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
        title={editing ? "Edit password" : "New password"}
        icon={<LockKeyhole className="h-5 w-5 text-brand-600" />}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={create.isPending || update.isPending}>
              Cancel
            </button>
            <button
              type="submit"
              form="password-form"
              className="btn btn-primary min-w-[120px]"
              disabled={create.isPending || update.isPending}
            >
              {create.isPending || update.isPending ? <ActionSpinner className="mr-1.5" /> : null}
              {create.isPending || update.isPending ? "Saving..." : "Save password"}
            </button>
          </>
        }
      >
        <div className="relative">
          <LoadingOverlay visible={create.isPending || update.isPending} text="Encrypting & saving password..." />
          <form id="password-form" onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Site / Title</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Facebook"
                required
                maxLength={190}
              />
            </div>
            <div>
              <label className="label">Username</label>
              <input
                className="input"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="e.g. you@email.com"
                maxLength={190}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    className="input w-full pr-10"
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Leave blank to keep current"
                    maxLength={500}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="icon-btn absolute right-2 top-1/2 -translate-y-1/2"
                    title={showPw ? "Hide" : "Show"}
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  title="Generate strong password"
                  onClick={() => {
                    setForm((f) => ({ ...f, password: generatePassword() }));
                    setShowPw(true);
                  }}
                >
                  <Wand2 className="h-4 w-4" /> Generate
                </button>
              </div>
            </div>
            <div>
              <label className="label">URL</label>
              <input
                className="input"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://facebook.com"
                maxLength={500}
              />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea
                className="input"
                rows={4}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Anything worth remembering…"
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

