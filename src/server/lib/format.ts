const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  PHP: "₱",
  EUR: "€",
  JPY: "¥",
  GBP: "£",
  CNY: "¥",
  AUD: "A$",
  CAD: "C$",
  INR: "₹",
  KRW: "₩",
  SGD: "S$",
};

export const CURRENCY_OPTIONS = [
  "USD",
  "PHP",
  "EUR",
  "JPY",
  "GBP",
  "CNY",
  "AUD",
  "CAD",
  "INR",
  "KRW",
  "SGD",
  "Other",
];

/** Symbol for a currency code. For "Other", the value itself is treated as a custom symbol. */
export function currencySymbol(currency: string | null | undefined): string {
  if (!currency) return "$";
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

/** Format a Decimal/number as money with the currency symbol prepended. */
export function money(
  value: number | string | null | undefined,
  currency: string | null | undefined = "USD",
): string {
  const sym = currencySymbol(currency);
  return `${sym}${Number(value ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Format a Decimal/number as a bare numeric string (no currency symbol), for exports/tables. */
export function moneyAmount(
  value: number | string | null | undefined,
): string {
  return Number(value ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Short display date. */
export function fmtDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Full date + time. */
export function fmtDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Human readable file size. */
export function humanSize(bytes: number | bigint | null | undefined): string {
  const b = Number(bytes ?? 0);
  if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${b} B`;
}

/** YYYY-MM-DD from a Date (for date inputs). */
export function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today as YYYY-MM-DD. */
export function todayInput(): string {
  return toDateInput(new Date());
}

/** Truncate text with ellipsis. */
export function truncate(text: string | null | undefined, max: number): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** First character (for avatars). */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

/** Slugify a text into a safe filename. */
export function slugify(text: string): string {
  return (
    text
      .trim()
      .replace(/[^A-Za-z0-9._\-\s]+/g, "_")
      .replace(/"/g, "") || "download"
  );
}
