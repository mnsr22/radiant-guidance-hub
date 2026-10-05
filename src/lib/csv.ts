import { generateReportPdf } from "@/lib/report-pdf";

/// All exports are branded Halal Connect PDFs. (Name kept for existing callers.)
export function downloadCSV<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns?: (keyof T)[],
): boolean {
  if (typeof document === "undefined") return false;
  if (!rows || rows.length === 0) return false;
  const cols = (columns ?? (Object.keys(rows[0]) as (keyof T)[])).map(String);
  const label = (c: string) =>
    c.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^\w/, (m) => m.toUpperCase());
  const fmt = (v: unknown) =>
    v == null ? "" : Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v);
  const base = filename.replace(/\.(csv|pdf)$/i, "");
  const title = label(base.replace(/^halal-connect-/, ""));
  generateReportPdf({
    filename: base,
    title,
    reportType: `${title} export`,
    summary: [{ label: "Records", value: String(rows.length) }],
    columns: cols.map(label),
    rows: rows.map((r) => cols.map((c) => fmt((r as Record<string, unknown>)[c]))),
  });
  return true;
}
