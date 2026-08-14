"use client";

import {
  CalendarDays,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  Globe,
  KeyRound,
  LockKeyhole,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  Wand2,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

import { Modal } from "~/components/ui/modal";
import { PaginationBar } from "~/components/ui/pagination";
import { EmptyState } from "~/components/ui/primitives";
import { useConfirm } from "~/components/ui/confirm";
import { useToast } from "~/components/ui/toast";
import { downloadCsv, downloadXls } from "~/lib/export";
import { fmtDate } from "~/server/lib/format";
import { api } from "~/trpc/react";
import { newClientId, type LocalRecord } from "~/lib/db/db";
import { useLocalEntity } from "~/lib/db/use-local-entity";

import { VaultPinModal } from "~/components/vault/vault-pin-modal";
import { useVaultLock } from "~/components/vault/use-vault-lock";
import { ActionSpinner, LoadingOverlay } from "~/components/ui/action-spinner";

interface PasswordRowData extends LocalRecord {
  title: string;
  username?: string | null;
  password?: string | null;
  url?: string | null;
  notes?: string | null;
  created_at?: Date | null;
}

type PasswordRow = PasswordRowData;


const EMPTY_FORM = {
  title: "",
  username: "",
  password: "",
  url: "",
  notes: "",
};

function getDomain(url: string): string {
  let normalized = url.trim();
  if (normalized && !/^[a-z][a-z0-9+.-]*:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  try {
    return new URL(normalized).hostname;
  } catch {
    return normalized.split("/")[0]?.split(":")[0] ?? normalized;
  }
}

function faviconUrl(url: string): string {
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(getDomain(url))}`;
}

const BRAND_THEMES: { match: string[]; bg: string; text: string; initial: string }[] = [
  { match: ["facebook"], bg: "bg-[#1877F2]", text: "text-white", initial: "f" },
  { match: ["instagram"], bg: "bg-gradient-to-br from-[#feda75] via-[#d62976] to-[#4f5bd5]", text: "text-white", initial: "ig" },
  { match: ["gmail"], bg: "bg-white ring-1 ring-slate-200", text: "text-[#EA4335]", initial: "m" },
  { match: ["youtube"], bg: "bg-[#FF0000]", text: "text-white", initial: "yt" },
  { match: ["google"], bg: "bg-white ring-1 ring-slate-200", text: "text-[#4285F4]", initial: "g" },
  { match: ["twitter", "x.com"], bg: "bg-black", text: "text-white", initial: "x" },
  { match: ["tiktok"], bg: "bg-black", text: "text-white", initial: "tt" },
  { match: ["github"], bg: "bg-[#181717]", text: "text-white", initial: "gh" },
  { match: ["gitlab"], bg: "bg-[#FC6D26]", text: "text-white", initial: "gl" },
  { match: ["linkedin"], bg: "bg-[#0A66C2]", text: "text-white", initial: "in" },
  { match: ["reddit"], bg: "bg-[#FF4500]", text: "text-white", initial: "r" },
  { match: ["whatsapp"], bg: "bg-[#25D366]", text: "text-[#075E54]", initial: "wa" },
  { match: ["telegram"], bg: "bg-[#229ED9]", text: "text-white", initial: "t" },
  { match: ["discord"], bg: "bg-[#5865F2]", text: "text-white", initial: "d" },
  { match: ["slack"], bg: "bg-[#4A154B]", text: "text-white", initial: "s" },
  { match: ["netflix"], bg: "bg-[#E50914]", text: "text-white", initial: "n" },
  { match: ["spotify"], bg: "bg-[#1DB954]", text: "text-black", initial: "s" },
  { match: ["amazon"], bg: "bg-[#FF9900]", text: "text-[#131A22]", initial: "a" },
  { match: ["apple", "icloud"], bg: "bg-black", text: "text-white", initial: "" },
  { match: ["microsoft", "outlook", "office"], bg: "bg-[#0078D4]", text: "text-white", initial: "ms" },
  { match: ["paypal"], bg: "bg-[#003087]", text: "text-white", initial: "p" },
  { match: ["stripe"], bg: "bg-[#635BFF]", text: "text-white", initial: "s" },
  { match: ["binance"], bg: "bg-[#F3BA2F]", text: "text-[#1E2026]", initial: "b" },
  { match: ["coinbase"], bg: "bg-[#0052FF]", text: "text-white", initial: "c" },
  { match: ["dropbox"], bg: "bg-[#0061FF]", text: "text-white", initial: "db" },
  { match: ["drive.google", "docs.google"], bg: "bg-white ring-1 ring-slate-200", text: "text-[#4285F4]", initial: "g" },
  { match: ["notion"], bg: "bg-black", text: "text-white", initial: "n" },
  { match: ["figma"], bg: "bg-white ring-1 ring-slate-200", text: "text-[#F24E1E]", initial: "f" },
  { match: ["canva"], bg: "bg-gradient-to-br from-[#00C4CC] to-[#7D2AE8]", text: "text-white", initial: "c" },
  { match: ["steam"], bg: "bg-[#1B2838]", text: "text-white", initial: "s" },
  { match: ["epic", "unreal"], bg: "bg-black", text: "text-white", initial: "e" },
  { match: ["roblox"], bg: "bg-black", text: "text-white", initial: "r" },
];

const FALLBACK_THEMES = [
  "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
];

function brandInitial(domain: string, title: string): string {
  const part = domain.replace(/^www\./, "").split(".")[0] ?? "";
  return (part[0] ?? title[0] ?? "?").toUpperCase();
}

function brandThemeFor(url: string, title: string): { bg: string; text: string; initial: string } {
  const domain = getDomain(url);
  const domainHay = domain.toLowerCase();
  const titleHay = title.toLowerCase();
  for (const theme of BRAND_THEMES) {
    if (theme.match.some((m) => domainHay.includes(m))) {
      return { bg: theme.bg, text: theme.text, initial: theme.initial || brandInitial(domain, title) };
    }
  }
  for (const theme of BRAND_THEMES) {
    if (theme.match.some((m) => titleHay.includes(m))) {
      return { bg: theme.bg, text: theme.text, initial: theme.initial || brandInitial(domain, title) };
    }
  }
  let h = 0;
  const key = domain || title;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const fallback = FALLBACK_THEMES[h % FALLBACK_THEMES.length]!;
  return {
    bg: fallback.split(" ")[0]!,
    text: fallback.split(" ")[1]!,
    initial: brandInitial(domain, title),
  };
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

function SiteLogo({ url, title, size = "md" }: { url: string; title: string; size?: "md" | "lg" }) {
  const [broken, setBroken] = useState(false);
  const large = size === "lg";
  const theme = brandThemeFor(url, title);
  const fallbackClass = large
    ? `flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-bold ${theme.bg} ${theme.text}`
    : `flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold ${theme.bg} ${theme.text}`;
  if (!url || broken) {
    return (
      <span className={fallbackClass}>
        {theme.initial}
      </span>
    );
  }
  return (
    <span
      className={
        large
          ? "flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
          : "flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
      }
    >
      <Image
        src={faviconUrl(url)}
        alt=""
        width={large ? 36 : 28}
        height={large ? 36 : 28}
        unoptimized
        onError={() => setBroken(true)}
      />
    </span>
  );
}

function InfoRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {icon}
        {label}
      </div>
      <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
        {children}
      </div>
    </div>
  );
}

export default function PasswordsPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewing, setViewing] = useState<PasswordRow | null>(null);
  const [editing, setEditing] = useState<PasswordRow | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPw, setShowPw] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const toast = useToast();
  const confirm = useConfirm();

  const utils = api.useUtils();
  const { rows, isLoading, upsert, remove } = useLocalEntity("passwords");

  const PAGE_SIZE = 12;

  const list = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase();
    const filtered = (rows as PasswordRow[]).filter((r) => {
      if (!needle) return true;
      const title = String(r.title ?? "").toLowerCase();
      const username = String(r.username ?? "").toLowerCase();
      const url = String(r.url ?? "").toLowerCase();
      return (
        title.includes(needle) ||
        username.includes(needle) ||
        url.includes(needle)
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

  const search = () => {
    setPage(1);
    setDebouncedQ(q.trim());
  };

  const { showPinModal, requestUnlock, handleSuccess } = useVaultLock();

  const openNew = () => {
    requestUnlock(() => {
      setViewing(null);
      setEditing(null);
      setForm(EMPTY_FORM);
      setShowPw(false);
      setModalOpen(true);
    });
  };

  const openEdit = (row: PasswordRow) => {
    requestUnlock(() => {
      setViewing(null);
      setShowPw(false);
      setEditing(row);
      setForm({
        title: row.title ?? "",
        username: row.username ?? "",
        password: row.password ?? "",
        url: row.url ?? "",
        notes: row.notes ?? "",
      });
      setModalOpen(true);
    });
  };

  const openView = (row: PasswordRow) => {
    setViewing(row);
    setModalOpen(false);
  };

  const closeView = () => {
    setViewing(null);
  };

  const toggleReveal = (id: number | null) => {
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
      const payload = { ...form, password: form.password.trim() };
      if (editing) {
        await upsert(editing, payload);
        toast("success", "Password updated.");
      } else {
        await upsert(
          {
            clientId: newClientId(),
            id: null,
            title: "",
            username: null,
            password: null,
            url: null,
            notes: null,
            updated_at: new Date(),
            created_at: null,
          },
          payload,
        );
        toast("success", "Password saved.");
      }
      if (typeof navigator !== "undefined" && navigator.onLine) {
        void utils.dashboard.overview.invalidate();
      }
      closeModal();
    } catch (err: unknown) {
      toast("error", err instanceof Error ? err.message : "Could not save password.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: PasswordRow) => {
    const ok = await confirm({
      title: "Delete password",
      message: `Permanently delete "${row.title}"? This cannot be undone.`,
    });
    if (!ok) return;
    try {
      await remove(row);
      toast("success", "Password deleted.");
      if (viewing?.clientId === row.clientId) {
        setViewing(null);
      }
      if (typeof navigator !== "undefined" && navigator.onLine) {
        void utils.dashboard.overview.invalidate();
      }
    } catch (err: unknown) {
      toast("error", err instanceof Error ? err.message : "Could not delete password.");
    }
  };

  const exportRows = useMemo(() => {
    return (rows as PasswordRow[]).map((p) => ({
      title: String(p.title ?? ""),
      username: String(p.username ?? ""),
      url: String(p.url ?? ""),
      notes: String(p.notes ?? ""),
      updated: fmtDate(p.updated_at),
    }));
  }, [rows]);

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
              {list.total} saved · encrypted at rest
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="card h-28 animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : list.rows.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={LockKeyhole}
            title="No passwords found"
            description="Save your first password or adjust your search."
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {list.rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => openView(row)}
                className="card group flex flex-col items-center gap-2 p-5 text-center transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <SiteLogo url={row.url ?? ""} title={row.title} size="lg" />
                <span className="mt-1 block w-full truncate text-sm font-semibold text-slate-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                  {row.title}
                </span>
                <span className="block w-full truncate text-[11px] text-slate-400">
                  {row.url ? getDomain(row.url) : "No URL"}
                </span>
              </button>
            ))}
          </div>
          {list.rows.length > 0 ? (
            <PaginationBar page={list.page} pages={list.pages} total={list.total} onChange={setPage} />
          ) : null}
        </>
      )}

      <Modal
        open={viewing !== null}
        onClose={closeView}
        title="Password details"
        icon={<LockKeyhole className="h-5 w-5 text-brand-600" />}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => viewing && openEdit(viewing)}
            >
              <Pencil className="h-4 w-4" /> Edit
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => viewing && handleDelete(viewing)}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </>
        }
      >
        {viewing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <SiteLogo url={viewing.url ?? ""} title={viewing.title} size="lg" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-lg font-semibold text-slate-900 dark:text-white">
                  {viewing.title}
                </h3>
                <span className="block truncate text-sm text-slate-400">
                  {viewing.url ? getDomain(viewing.url) : "No URL"}
                </span>
              </div>
              {viewing.url ? (
                <a
                  href={viewing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="icon-btn shrink-0"
                  title={`Open ${getDomain(viewing.url)}`}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </div>

            <InfoRow label="Username" icon={<UserRound className="h-3.5 w-3.5" />}>
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">{viewing.username ?? "No username"}</span>
                {viewing.username ? (
                  <CopyButton value={viewing.username} title="Copy username" />
                ) : null}
              </div>
            </InfoRow>

            <InfoRow label="Password" icon={<KeyRound className="h-3.5 w-3.5" />}>
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate font-mono">
                  {viewing.password
                    ? revealed[String(viewing.id)]
                      ? viewing.password
                      : "••••••••••••"
                    : "—"}
                </span>
                {viewing.password ? (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <CopyButton value={viewing.password} title="Copy password" />
                    <button
                      type="button"
                      className="icon-btn"
                      title={revealed[String(viewing.id)] ? "Hide password" : "Show password"}
                      onClick={() => toggleReveal(viewing.id)}
                    >
                      {revealed[String(viewing.id)] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ) : null}
              </div>
            </InfoRow>

            {viewing.url ? (
              <InfoRow label="URL" icon={<Globe className="h-3.5 w-3.5" />}>
                <a
                  href={viewing.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-brand-600 hover:underline dark:text-brand-400"
                >
                  {viewing.url}
                </a>
              </InfoRow>
            ) : null}

            {viewing.notes ? (
              <InfoRow label="Notes" icon={<FileDown className="h-3.5 w-3.5" />}>
                <p className="whitespace-pre-wrap break-words">{viewing.notes}</p>
              </InfoRow>
            ) : null}

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <CalendarDays className="h-3.5 w-3.5" />
              Updated {fmtDate(viewing.updated_at)}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? "Edit password" : "New password"}
        icon={<LockKeyhole className="h-5 w-5 text-brand-600" />}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button
              type="submit"
              form="password-form"
              className="btn btn-primary min-w-[120px]"
              disabled={saving}
            >
              {saving ? <ActionSpinner className="mr-1.5" /> : null}
              {saving ? "Saving..." : "Save password"}
            </button>
          </>
        }
      >
        <div className="relative">
          <LoadingOverlay visible={saving} text="Saving password..." />
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
