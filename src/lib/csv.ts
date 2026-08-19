/// Client-side CSV export. Works on any host/domain (no server round-trip),
/// including custom domains: it builds a Blob and clicks a temporary link.
export function downloadCSV<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns?: (keyof T)[],
): boolean {
  if (typeof document === "undefined") return false; // SSR guard
  if (!rows || rows.length === 0) return false;
  const cols = (columns ?? (Object.keys(rows[0]) as (keyof T)[])).map(String);
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // CRLF + UTF-8 BOM keeps Excel happy with accents and Arabic text.
  const csv =
    "\uFEFF" +
    [
      cols.join(","),
      ...rows.map((r) => cols.map((c) => escape((r as Record<string, unknown>)[c])).join(",")),
    ].join("\r\n");

  const name = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

  // Legacy Edge/IE fallback.
  const nav = navigator as Navigator & { msSaveBlob?: (b: Blob, n: string) => boolean };
  if (typeof nav.msSaveBlob === "function") {
    nav.msSaveBlob(blob, name);
    return true;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  // Revoke on the next tick — some browsers abort the download otherwise.
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
  return true;
}
