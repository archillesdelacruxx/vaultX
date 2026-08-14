const SYMBOLS: Record<string, string> = {
  USD: "$",
  PHP: "₱",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  KRW: "₩",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  INR: "₹",
  MYR: "RM",
  IDR: "Rp",
  THB: "฿",
  VND: "₫",
  AED: "د.إ",
};

export function currencySymbol(currency: string | undefined): string {
  if (!currency) return "₱";
  return SYMBOLS[currency.toUpperCase()] ?? `${currency.toUpperCase()} `;
}

export function formatMoney(
  amount: number | null | undefined,
  currency: string | undefined,
): string {
  const n = Number(amount ?? 0);
  const symbol = currencySymbol(currency);
  const s = n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${s}`;
}

export function dateToStr(d: Date | string | null | undefined): string {
  if (!d) return "";
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return d.slice(0, 10);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const s = d instanceof Date ? dateToStr(d) : d;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!match) return s;
  return `${match[2]}/${match[3]}/${match[1]}`;
}
