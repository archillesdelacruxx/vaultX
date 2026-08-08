"use client";

import {
  Banknote,
  Copy,
  Eye,
  EyeOff,
  FileDown,
  FileSpreadsheet,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wifi,
} from "lucide-react";
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

interface RowData extends LocalRecord {
  bankName: string;
  accountType?: string | null;
  accountNumber?: string | null;
  cardNumber?: string | null;
  cvv?: string | null;
  expiry?: string | null;
  pin?: string | null;
  accountHolder?: string | null;
  branch?: string | null;
  notes?: string | null;
  created_at?: Date | null;
}

type Row = RowData;

const EMPTY_FORM = {
  bankName: "",
  accountType: "",
  accountNumber: "",
  cardNumber: "",
  cvv: "",
  expiry: "",
  pin: "",
  accountHolder: "",
  branch: "",
  notes: "",
};

const THEMES = [
  "from-slate-900 via-slate-800 to-slate-900",
  "from-[#1e1b4b] via-[#312e81] to-[#0f172a]",
  "from-[#0f172a] via-[#164e63] to-[#083344]",
  "from-[#450a0a] via-[#7f1d1d] to-[#0f172a]",
  "from-[#14532d] via-[#166534] to-[#0f172a]",
  "from-[#3b0764] via-[#6b21a8] to-[#0f172a]",
];

const themeFor = (name: string) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return THEMES[h % THEMES.length];
};

const groupCardNumber = (v: string) => v.replace(/[^0-9]/g, "").replace(/(.{4})/g, "$1 ").trim();

function CopyIconButton({ value, className, title = "Copy" }: { value: string; className?: string; title?: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      className={className}
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
      <Copy className="h-3.5 w-3.5" />
    </button>
  );
}

function EmvChip() {
  return (
    <div className="h-8 w-11 shrink-0 rounded-md bg-gradient-to-br from-yellow-100 via-amber-300 to-yellow-500 p-[3px] shadow-inner">
      <div className="flex h-full w-full flex-col justify-between rounded-[4px] border border-amber-700/40">
        <span className="h-px bg-amber-700/40" />
        <span className="mx-1.5 h-px bg-amber-700/40" />
        <span className="h-px bg-amber-700/40" />
      </div>
    </div>
  );
}

function CardRow({
  label,
  value,
  masked,
  revealed,
  onToggle,
  copyValue,
  className = "",
}: {
  label: string;
  value: string;
  masked: string;
  revealed: boolean;
  onToggle: () => void;
  copyValue: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50">{label}</div>
      <div className="flex items-center gap-1">
        <span className="truncate font-mono text-[11px] font-medium tracking-wider text-white">
          {value ? (revealed ? value : masked) : "—"}
        </span>
        {value ? (
          <>
            <button type="button" onClick={onToggle} className="text-white/70 transition hover:text-white" title={revealed ? "Hide" : "Show"}>
              {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
            <CopyIconButton value={copyValue} className="text-white/70 transition hover:text-white" title={`Copy ${label}`} />
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function BankingPage() {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [revealed, setRevealed] = useState<Record<string, { num?: boolean; sa?: boolean; cvv?: boolean }>>({});
  const [saving, setSaving] = useState(false);

  const toast = useToast();
  const confirm = useConfirm();
  const utils = api.useUtils();

  const { rows, isLoading, upsert, remove } = useLocalEntity("banking");

  const PAGE_SIZE = 12;

  const list = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase();
    const filtered = (rows as Row[]).filter((r) => {
      if (!needle) return true;
      const bankName = String(r.bankName ?? "").toLowerCase();
      const holder = String(r.accountHolder ?? "").toLowerCase();
      const card = String(r.cardNumber ?? "").toLowerCase();
      const sa = String(r.accountNumber ?? "").toLowerCase();
      return bankName.includes(needle) || holder.includes(needle) || card.includes(needle) || sa.includes(needle);
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
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditing(row);
    setForm({
      bankName: row.bankName,
      accountType: row.accountType ?? "",
      accountNumber: row.accountNumber ?? "",
      cardNumber: row.cardNumber ?? "",
      cvv: row.cvv ?? "",
      expiry: row.expiry ?? "",
      pin: row.pin ?? "",
      accountHolder: row.accountHolder ?? "",
      branch: row.branch ?? "",
      notes: row.notes ?? "",
    });
    setModalOpen(true);
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
        toast("success", "Account updated.");
      } else {
        await upsert(
          {
            clientId: newClientId(),
            id: null,
            bankName: "",
            accountType: null,
            accountNumber: null,
            cardNumber: null,
            cvv: null,
            expiry: null,
            pin: null,
            accountHolder: null,
            branch: null,
            notes: null,
            updated_at: new Date(),
            created_at: null,
          },
          { ...form },
        );
        toast("success", "Account saved.");
      }
      if (typeof navigator !== "undefined" && navigator.onLine) {
        void utils.dashboard.overview.invalidate();
      }
      closeModal();
    } catch (err: unknown) {
      toast("error", err instanceof Error ? err.message : "Could not save account.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: Row) => {
    const ok = await confirm({
      title: "Delete account",
      message: `Permanently delete "${row.bankName}"? This cannot be undone.`,
    });
    if (!ok) return;
    try {
      await remove(row);
      toast("success", "Account deleted.");
      if (typeof navigator !== "undefined" && navigator.onLine) {
        void utils.dashboard.overview.invalidate();
      }
    } catch (err: unknown) {
      toast("error", err instanceof Error ? err.message : "Could not delete account.");
    }
  };

  const exportRows = useMemo(
    () =>
      (rows as Row[]).map((r) => ({
        bank: r.bankName,
        type: r.accountType ?? "",
        holder: r.accountHolder ?? "",
        card: r.cardNumber ?? "",
        sa: r.accountNumber ?? "",
        cvv: r.cvv ?? "",
        expiry: r.expiry ?? "",
        branch: r.branch ?? "",
        notes: r.notes ?? "",
        updated: fmtDate(r.updated_at),
      })),
    [rows],
  );

  const doExport = (format: "csv" | "xls") => {
    const headers = ["Bank", "Account type", "Holder", "Card number", "SA number", "CVV", "Expiry", "Branch", "Notes", "Updated"];
    if (format === "csv") downloadCsv("banking.csv", headers, exportRows);
    else downloadXls("banking.xls", headers, exportRows, "Banking");
  };

  const toggle = (id: number | null, key: "num" | "sa" | "cvv") => {
    const k = String(id);
    setRevealed((r) => ({ ...r, [k]: { ...r[k], [key]: !r[k]?.[key] } }));
  };

  const maskCard = (v: string) => (v.length >= 4 ? `•••• •••• •••• ${v.slice(-4)}` : "••••");
  const maskSa = (v: string) => (v.length >= 4 ? `•••••• ${v.slice(-4)}` : "••••");
  const maskCvv = (_v: string) => "•••";

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Banking</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {list.total} accounts · details encrypted
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input w-52 py-1.5 pl-10"
                placeholder="Search accounts…"
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
              <Plus className="h-4 w-4" /> New account
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[1.586] w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : list.rows.length === 0 ? (
        <div className="card">
          <EmptyState icon={Banknote} title="No accounts found" description="Add your first bank account or adjust your search." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.rows.map((row) => {
              const rev = revealed[String(row.id)] ?? {};
              return (
                <div
                  key={row.id}
                  className={`group relative aspect-[1.586] w-full overflow-hidden rounded-2xl bg-gradient-to-br ${themeFor(row.bankName)} p-4 text-white shadow-lg shadow-slate-900/20 ring-1 ring-white/10 transition hover:shadow-xl`}
                >
                  <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                  <div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-white/5 blur-2xl" />

                  <div className="relative flex h-full flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Banknote className="h-3.5 w-3.5 text-white/60" />
                          <span className="truncate text-sm font-bold uppercase tracking-widest text-white">
                            {row.bankName || "Bank"}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-white/50">
                          {row.accountType ?? "Account"}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Wifi className="h-4 w-4 -rotate-90 text-white/70" />
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/80 opacity-0 transition hover:bg-white/20 group-hover:opacity-100"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-red-300 opacity-0 transition hover:bg-white/20 group-hover:opacity-100"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <EmvChip />
                    </div>

                    <div className="mt-1.5 flex-1">
                      <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50">Card number</div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className="font-mono text-[15px] font-semibold tracking-[0.12em] text-white">
                          {row.cardNumber ? (rev.num ? groupCardNumber(row.cardNumber) : maskCard(row.cardNumber)) : "———— ———— ———— ————"}
                        </span>
                        {row.cardNumber ? (
                          <>
                            <button
                              type="button"
                              onClick={() => toggle(row.id, "num")}
                              className="text-white/70 transition hover:text-white"
                              title={rev.num ? "Hide card number" : "Show card number"}
                            >
                              {rev.num ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                            <CopyIconButton
                              value={row.cardNumber ?? ""}
                              className="text-white/70 transition hover:text-white"
                              title="Copy card number"
                            />
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <CardRow
                        label="SA"
                        value={row.accountNumber ?? ""}
                        masked={maskSa(row.accountNumber ?? "")}
                        revealed={!!rev.sa}
                        onToggle={() => toggle(row.id, "sa")}
                        copyValue={row.accountNumber ?? ""}
                        className="min-w-0 flex-1"
                      />
                      <CardRow
                        label="CVV"
                        value={row.cvv ?? ""}
                        masked={maskCvv(row.cvv ?? "")}
                        revealed={!!rev.cvv}
                        onToggle={() => toggle(row.id, "cvv")}
                        copyValue={row.cvv ?? ""}
                      />
                      {row.expiry ? (
                        <div className="shrink-0">
                          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/50">Expiry</div>
                          <div className="font-mono text-[11px] font-medium tracking-wider text-white">{row.expiry}</div>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-end justify-between gap-3 border-t border-white/10 pt-2.5">
                      <div className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.15em] text-white">
                        {row.accountHolder ?? "—"}
                      </div>
                      <div className="shrink-0 text-[10px] text-white/40">Updated {fmtDate(row.updated_at)}</div>
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
        title={editing ? "Edit account" : "New account"}
        icon={<Banknote className="h-5 w-5 text-brand-600" />}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </button>
            <button
              type="submit"
              form="banking-form"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save account"}
            </button>
          </>
        }
      >
        <form id="banking-form" onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Bank name</label>
              <input
                className="input"
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                placeholder="e.g. BDO"
                required
                maxLength={190}
              />
            </div>
            <div>
              <label className="label">Account type</label>
              <input
                className="input"
                value={form.accountType}
                onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                placeholder="e.g. Savings"
                maxLength={60}
              />
            </div>
            <div>
              <label className="label">Account holder</label>
              <input
                className="input"
                value={form.accountHolder}
                onChange={(e) => setForm({ ...form, accountHolder: e.target.value })}
                maxLength={190}
              />
            </div>
            <div>
              <label className="label">Branch</label>
              <input
                className="input"
                value={form.branch}
                onChange={(e) => setForm({ ...form, branch: e.target.value })}
                maxLength={190}
              />
            </div>
            <div className="col-span-2 grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="label">Card number</label>
                <input
                  className="input"
                  value={form.cardNumber}
                  onChange={(e) => setForm({ ...form, cardNumber: e.target.value })}
                  placeholder="1234 5678 9012 3456"
                  maxLength={30}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="label">CVV</label>
                <input
                  className="input"
                  value={form.cvv}
                  onChange={(e) => setForm({ ...form, cvv: e.target.value })}
                  placeholder="123"
                  maxLength={10}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="label">Expiry</label>
                <input
                  className="input"
                  value={form.expiry}
                  onChange={(e) => setForm({ ...form, expiry: e.target.value })}
                  placeholder="MM/YY"
                  maxLength={7}
                />
              </div>
            </div>
            <div>
              <label className="label">SA number / Account number</label>
              <input
                className="input"
                value={form.accountNumber}
                onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                maxLength={60}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="label">PIN</label>
              <input
                className="input"
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value })}
                maxLength={20}
                autoComplete="off"
              />
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea
                className="input"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                maxLength={20000}
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
