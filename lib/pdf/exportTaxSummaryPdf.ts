// lib/pdf/exportTaxSummaryPdf.ts
import { jsPDF } from "jspdf";
import { applyPreviewWatermark } from "./applyPreviewWatermark";
import { isUnlocked, type AccessState } from "@/lib/access/accessState";

export type TaxSummaryPdfData = {
  filingStatus: string;

  agi: number;
  taxableIncome: number;
  incomeTax: number;
  seTax: number;
  totalTax: number;

  quarterlyPayment?: number;
  safeHarborAmount?: number;

  // Optional: if you pass these later, we’ll print them nicely
  withholding?: number;
  refundOrOwed?: number;
  effectiveRate?: number; // 0-1
  otherDependentCredit?: number;
  childTaxCreditUsed?: number;
  actcRefundable?: number;
};

/**
 * Exports the full federal tax summary PDF.
 * Paid document (or included with filing).
 * - Locked: watermarked preview and hides premium planning details
 * - Unlocked: full details
 */
export function exportTaxSummaryPdf({
  data,
  access,
  taxYear,
}: {
  data: TaxSummaryPdfData;
  access: AccessState;
  taxYear: number;
}) {
  // Guard: client-only download
  if (typeof window === "undefined") return;

  const unlocked = isUnlocked(access);
  const pdf = new jsPDF({ unit: "pt", format: "letter" });

  if (!unlocked) applyPreviewWatermark(pdf);

  const PAGE_W = pdf.internal.pageSize.getWidth();
  const PAGE_H = pdf.internal.pageSize.getHeight();
  const M = 48; // margin
  const RIGHT = PAGE_W - M;

  const fmtMoney = (n: number) => {
    const abs = Math.abs(n);
    const s = abs.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    });
    return n < 0 ? `(${s})` : s;
  };

  const fmtPct = (n: number) =>
    `${(n * 100).toFixed(1)}%`;

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
  pdf.setTextColor(20);
  pdf.text("Federal Tax Summary (Estimate)", M, y);

  y += 22;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(90);

  pdf.text(`Tax Year: ${taxYear}`, M, y);
  pdf.text(unlocked ? "Status: Unlocked" : "Status: Locked Preview", RIGHT, y, {
    align: "right",
  });

  y += 14;
  pdf.text(`Filing Status: ${data.filingStatus}`, M, y);

  // Divider
  y += 16;
  pdf.setDrawColor(220);
  pdf.line(M, y, RIGHT, y);

  // Snapshot box
  y += 18;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(20);
  pdf.text("Summary", M, y);

  y += 10;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(110);

  const refundOrOwedLine =
    typeof data.refundOrOwed === "number"
      ? data.refundOrOwed >= 0
        ? `Estimated Refund: ${fmtMoney(data.refundOrOwed)}`
        : `Estimated Amount Owed: ${fmtMoney(Math.abs(data.refundOrOwed))}`
      : null;

  const summaryLines = [
    refundOrOwedLine,
    typeof data.withholding === "number"
      ? `Withholding: ${fmtMoney(data.withholding)}`
      : null,
    typeof data.effectiveRate === "number"
      ? `Effective tax rate: ${fmtPct(data.effectiveRate)}`
      : null,
  ].filter(Boolean) as string[];

  if (summaryLines.length) {
    for (const line of summaryLines) {
      y += 14;
      y = addPageIfNeeded(y);
      pdf.text(line, M, y);
    }
  }

  // Core table
  y += 22;
  y = addPageIfNeeded(y);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setTextColor(20);
  pdf.text("Federal Estimate Breakdown", M, y);

  y += 16;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.text("Item", M, y);
  pdf.text("Amount", RIGHT, y, { align: "right" });

  y += 8;
  pdf.setDrawColor(235);
  pdf.line(M, y, RIGHT, y);

  y += 18;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(20);

  const rows: Array<{ label: string; value?: number; premium?: boolean }> = [
    { label: "Adjusted Gross Income (AGI)", value: data.agi },
    { label: "Taxable income", value: data.taxableIncome },
    { label: "Income tax", value: data.incomeTax },
    { label: "Self-employment tax", value: data.seTax },
    { label: "Total federal tax", value: data.totalTax },

    // Optional credits (if you pass them later)
    { label: "Credit for Other Dependents (ODC)", value: data.otherDependentCredit },
    { label: "Child Tax Credit used (CTC)", value: data.childTaxCreditUsed },
    { label: "Refundable ACTC", value: data.actcRefundable },

    // Premium planning
    { label: "Suggested quarterly payment", value: data.quarterlyPayment, premium: true },
    { label: "Safe harbor payment amount", value: data.safeHarborAmount, premium: true },
  ];

  for (const r of rows) {
    if (r.value === undefined) continue;

    y = addPageIfNeeded(y);

    pdf.setTextColor(20);
    pdf.text(r.label, M, y);

    // Locked preview hides premium numbers
    if (!unlocked && r.premium) {
      pdf.setTextColor(120);
      pdf.text("LOCKED", RIGHT, y, { align: "right" });
    } else {
      pdf.setTextColor(20);
      pdf.text(fmtMoney(r.value), RIGHT, y, { align: "right" });
    }

    y += 18;
  }

  // Locked preview callout
  if (!unlocked) {
    y += 8;
    y = addPageIfNeeded(y);

    pdf.setDrawColor(230);
    pdf.setFillColor(245, 245, 245);
    // simple filled box
    pdf.rect(M, y, RIGHT - M, 62, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(20);
    pdf.text("Locked Preview", M + 10, y + 18);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(90);
    pdf.text(
      "Unlock to view quarterly payment amounts, safe harbor planning, and the full tax plan summary.",
      M + 10,
      y + 34,
      { maxWidth: RIGHT - M - 20 }
    );

    y += 78;
  }

  // Footer
  y += 10;
  y = addPageIfNeeded(y);

  pdf.setDrawColor(235);
  pdf.line(M, y, RIGHT, y);

  y += 14;
  pdf.setFontSize(9);
  pdf.setTextColor(110);
  pdf.text(
    "This report is for tax planning purposes only and is not a filed tax return or official IRS document.",
    M,
    y
  );
  y += 12;
  pdf.text(
    "Final results may differ based on eligibility, SSN/ITIN rules, credits, and verified filing data.",
    M,
    y
  );

  pdf.save(
    unlocked
      ? `Federal-Tax-Summary-${taxYear}.pdf`
      : `Federal-Tax-Summary-PREVIEW-${taxYear}.pdf`
  );
}
