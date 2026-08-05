export type ExportRow = Record<string, string | number | boolean | null | undefined>;

function escapeCsv(value: string | number | boolean | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function buildCsv(headers: string[], rows: ExportRow[]): string {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(","));
  }
  return lines.join("\r\n");
}

export function buildXls(
  headers: string[],
  rows: ExportRow[],
  title: string,
): string {
  const head = headers.map((h) => `<th>${h}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${headers
          .map((h) => {
            const v = r[h] ?? "";
            const s = String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            return `<td>${s}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8"><title>${title}</title></head>
<body><table><tr>${head}</tr>${body}</table></body></html>`;
}

export function downloadFile(
  filename: string,
  content: string,
  mime: string,
) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, headers: string[], rows: ExportRow[]) {
  downloadFile(filename, buildCsv(headers, rows), "text/csv;charset=utf-8");
}

export function downloadXls(filename: string, headers: string[], rows: ExportRow[], title: string) {
  downloadFile(filename, buildXls(headers, rows, title), "application/vnd.ms-excel;charset=utf-8");
}
