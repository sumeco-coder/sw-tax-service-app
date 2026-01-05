// lib/pdf/exportScheduleSEPdf.ts
import { jsPDF } from "jspdf";
import { applyPreviewWatermark } from "./applyPreviewWatermark";
import { isUnlocked, type AccessState } from "@/lib/access/accessState";

export type ScheduleSESummaryData = {
  netEarnings: number; // net profit * 92.35%
  ssTax: number; // 12.4% up to wage base
  medicareTax: number; // 2.9% all net earnings
  additionalMedicareTax: number; // 0.9% above threshold
  seTax: number; // total SE tax
  deductibleHalf: number; // 1/2 SE tax deduction
};

/**
 * Exports a Schedule SE summary PDF.
 * Free export; shows a watermark if locked.
 */
export function exportScheduleSEPdf({
  data,
  access,
  taxYear,
}: {
  data: ScheduleSESummaryData;
  access: AccessState;
  taxYear: number;
}) {
  // Guard: this exporter is meant to run in the browser
  if (typeof window === "undefined") return;

  const unlocked = isUnlocked(access);
  const pdf = new jsPDF({ unit: "pt", format: "letter" });

  if (!unlocked) applyPreviewWatermark(pdf);

  const PAGE_W = pdf.internal.pageSize.getWidth();
  const PAGE_H = pdf.internal.pageSize.getHeight();

  const M = 48; // margin
  const COL_RIGHT = PAGE_W - M;
  const LINE_H = 16;

  const fmtMoney = (n: number) => {
    const abs = Math.abs(n);
    const s = abs.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });
    return n < 0 ? `(${s})` : s;
  };

  const addPageIfNeeded = (y: number) => {
    if (y > PAGE_H - 90) {
      pdf.addPage();
      if (!unlocked) applyPreviewWatermark(pdf);
      return M;
    }
    return y;
  };

  let y = M;

  // Title
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("Schedule SE Summary (Estimate)", M, y);

  y += 22;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(90);

  pdf.text(`Tax Year: ${taxYear}`, M, y);
  pdf.text(
    unlocked ? "Status: Unlocked" : "Status: Locked Preview",
    COL_RIGHT,
    y,
    { align: "right" }
  );

  // Divider
  y += 18;
  pdf.setDrawColor(220);
  pdf.line(M, y, COL_RIGHT, y);

  y += 22;
  pdf.setTextColor(30);
  pdf.setFontSize(12);

  const rows: Array<{ label: string; value: number; note?: string }> = [
    {
      label: "Net earnings subject to SE tax (92.35%)",
      value: data.netEarnings,
      note: "Net profit × 0.9235",
    },
    {
      label: "Social Security tax (12.4%)",
      value: data.ssTax,
      note: "Limited by wage base",
    },
    {
      label: "Medicare tax (2.9%)",
      value: data.medicareTax,
      note: "Applies to all SE earnings",
    },
    {
      label: "Additional Medicare tax (0.9%)",
      value: data.additionalMedicareTax,
      note: "Above threshold (if applicable)",
    },
    { label: "Total self-employment tax", value: data.seTax },
    { label: "Deductible half of SE tax", value: -data.deductibleHalf },
  ];

  // Table header
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("Item", M, y);
  pdf.text("Amount", COL_RIGHT, y, { align: "right" });

  y += 10;
  pdf.setDrawColor(235);
  pdf.line(M, y, COL_RIGHT, y);

  y += 18;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);

  for (const r of rows) {
    y = addPageIfNeeded(y);

    pdf.setTextColor(20);
    pdf.text(r.label, M, y);

    pdf.setTextColor(20);
    pdf.text(fmtMoney(r.value), COL_RIGHT, y, { align: "right" });

    if (r.note) {
      y += 13;
      y = addPageIfNeeded(y);
      pdf.setFontSize(9);
      pdf.setTextColor(110);
      pdf.text(r.note, M, y);
      pdf.setFontSize(11);
      pdf.setTextColor(20);
    }

    y += 18;
  }

  // Footer note
  y += 6;
  y = addPageIfNeeded(y);

  pdf.setDrawColor(235);
  pdf.line(M, y, COL_RIGHT, y);
  y += 16;

  pdf.setFontSize(9);
  pdf.setTextColor(110);

  const footer = [
    "This PDF is a planning estimate based on IRS Schedule SE concepts (not an official IRS form).",
    "Final results may differ after deductions, credits, and eligibility checks are verified during filing.",
  ];

  pdf.text(footer[0], M, y);
  y += 12;
  pdf.text(footer[1], M, y);

  // Save
  pdf.save(
    unlocked
      ? `Schedule-SE-Summary-${taxYear}.pdf`
      : `Schedule-SE-Summary-PREVIEW-${taxYear}.pdf`
  );
}
