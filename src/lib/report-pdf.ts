// Branded, multi-page PDF reports for the Halal Connect admin dashboard.
// Browser-only (jsPDF touches Blob/URL) — call from event handlers.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Brand palette, converted from the app's oklch tokens to RGB for jsPDF.
const PURPLE: [number, number, number] = [109, 40, 217]; // primary
const PURPLE_LIGHT: [number, number, number] = [167, 92, 246]; // primary-glow
const INK: [number, number, number] = [30, 27, 46];
const MUTED: [number, number, number] = [120, 115, 140];
const TINT: [number, number, number] = [245, 240, 255];

export type ReportSummaryItem = { label: string; value: string };

export interface ReportSpec {
  /// Filename without extension.
  filename: string;
  title: string;
  reportType: string;
  filters?: string[];
  summary?: ReportSummaryItem[];
  narrative?: string;
  columns: string[];
  rows: (string | number | null | undefined)[][];
  /// Optional relative column widths (same length as columns).
  columnWidths?: number[];
}

function crescent(doc: jsPDF, x: number, y: number, r: number) {
  // Subtle Islamic-inspired mark: a filled disc with an offset knock-out.
  doc.setFillColor(255, 255, 255);
  doc.circle(x, y, r, "F");
  doc.setFillColor(...PURPLE);
  doc.circle(x, y, r, "F");
  doc.setFillColor(255, 255, 255);
  doc.circle(x + r * 0.42, y - r * 0.16, r * 0.82, "F");
  doc.setFillColor(...PURPLE);
  doc.circle(x + r * 0.62, y - r * 0.24, r * 0.78, "F");
}

function header(doc: jsPDF, spec: ReportSpec, generated: string) {
  const w = doc.internal.pageSize.getWidth();
  // Gradient-ish band: stacked slices from primary to primary-glow.
  const bandH = 34;
  const slices = 48;
  for (let i = 0; i < slices; i++) {
    const t = i / (slices - 1);
    doc.setFillColor(
      Math.round(PURPLE[0] + (PURPLE_LIGHT[0] - PURPLE[0]) * t),
      Math.round(PURPLE[1] + (PURPLE_LIGHT[1] - PURPLE[1]) * t),
      Math.round(PURPLE[2] + (PURPLE_LIGHT[2] - PURPLE[2]) * t),
    );
    doc.rect((w / slices) * i, 0, w / slices + 0.6, bandH, "F");
  }

  doc.setFillColor(255, 255, 255);
  doc.circle(18, 15, 6.5, "F");
  crescent(doc, 18, 15, 4.2);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Halal Connect", 29, 13.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Administrative Report", 29, 19);

  doc.setFontSize(8.5);
  doc.text(`Generated: ${generated}`, w - 14, 13.5, { align: "right" });
  doc.text(spec.reportType, w - 14, 19, { align: "right" });

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(spec.title, 14, bandH + 13);
}

function footer(doc: jsPDF, generated: string) {
  const pages = doc.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...PURPLE_LIGHT);
    doc.setLineWidth(0.4);
    doc.line(14, h - 14, w - 14, h - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("Halal Connect · Confidential Administrative Report", 14, h - 9);
    doc.text(`Generated: ${generated}`, w / 2, h - 9, { align: "center" });
    doc.text(`Page ${p} of ${pages}`, w - 14, h - 9, { align: "right" });
  }
}

function summaryCards(doc: jsPDF, items: ReportSummaryItem[], startY: number): number {
  const w = doc.internal.pageSize.getWidth();
  const perRow = 3;
  const gap = 4;
  const cardW = (w - 28 - gap * (perRow - 1)) / perRow;
  const cardH = 19;
  let y = startY;

  items.forEach((item, i) => {
    const col = i % perRow;
    if (col === 0 && i > 0) y += cardH + gap;
    const x = 14 + col * (cardW + gap);
    doc.setFillColor(...TINT);
    doc.setDrawColor(...PURPLE_LIGHT);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardW, cardH, 2.5, 2.5, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(item.label, cardW - 8)[0] ?? item.label, x + 4, y + 6.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...PURPLE);
    doc.text(item.value, x + 4, y + 14.5);
  });

  return y + cardH + 6;
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  doc.setFillColor(...PURPLE);
  doc.rect(14, y - 3.6, 2.2, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text(text, 19, y);
  return y + 4;
}

/// Builds and downloads the PDF. Throws on failure so the caller can show an
/// error state instead of a fake "report generated" toast.
export function generateReportPdf(spec: ReportSpec) {
  if (typeof window === "undefined") throw new Error("PDF export is only available in the browser.");

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const generated = new Date().toLocaleString();

  header(doc, spec, generated);
  let y = 52;

  if (spec.filters?.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const line = `Filters: ${spec.filters.join("  ·  ")}`;
    const wrapped = doc.splitTextToSize(line, doc.internal.pageSize.getWidth() - 28);
    doc.text(wrapped, 14, y);
    y += wrapped.length * 4.4 + 3;
  }

  if (spec.summary?.length) {
    y = sectionTitle(doc, "Summary", y + 2);
    y = summaryCards(doc, spec.summary, y);
  }

  if (spec.narrative) {
    y = sectionTitle(doc, "Overview", y + 1);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    const wrapped = doc.splitTextToSize(spec.narrative, doc.internal.pageSize.getWidth() - 28);
    doc.text(wrapped, 14, y + 1);
    y += wrapped.length * 4.4 + 5;
  }

  y = sectionTitle(doc, "Data", y + 1);

  const styles: Record<number, { cellWidth: number }> = {};
  if (spec.columnWidths) {
    const usable = doc.internal.pageSize.getWidth() - 28;
    const total = spec.columnWidths.reduce((a, b) => a + b, 0);
    spec.columnWidths.forEach((wgt, i) => {
      styles[i] = { cellWidth: (wgt / total) * usable };
    });
  }

  autoTable(doc, {
    startY: y + 1,
    head: [spec.columns],
    body: spec.rows.map((r) => r.map((c) => (c === null || c === undefined ? "—" : String(c)))),
    margin: { left: 14, right: 14, bottom: 20 },
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.2,
      overflow: "linebreak",
      valign: "middle",
      textColor: INK,
      lineColor: [228, 222, 240],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: PURPLE,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.2,
    },
    alternateRowStyles: { fillColor: [250, 248, 255] },
    columnStyles: styles,
    // Repeat the header band on every page so continuation pages stay branded.
    didDrawPage: (d) => {
      if (d.pageNumber > 1) header(doc, spec, generated);
    },
  });

  footer(doc, generated);
  doc.save(`${spec.filename}.pdf`);
}
