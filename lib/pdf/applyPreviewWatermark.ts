// lib/pdf/applyPreviewWatermark.ts
import type { jsPDF } from "jspdf";

/**
 * Applies a large diagonal PREVIEW watermark + footer disclaimer.
 * Call this ONCE per page:
 * - right after creating jsPDF()
 * - and again after pdf.addPage()
 */
export function applyPreviewWatermark(pdf: jsPDF) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // Save current styles (best-effort; jsPDF has limited state APIs)
  const prevFontSize = (pdf as any).getFontSize?.() ?? 12;

  // --- Big diagonal watermark (centered) ---
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(64);
  pdf.setTextColor(225, 225, 225);

  const wm = "PREVIEW";
  pdf.text(wm, pageW / 2, pageH / 2, {
    angle: 35,
    align: "center",
  });

  // Optional: subtle brand line under it
  pdf.setFontSize(14);
  pdf.setTextColor(235, 235, 235);
  pdf.text("SW Tax Service", pageW / 2, pageH / 2 + 34, {
    angle: 35,
    align: "center",
  });

  // --- Footer disclaimer (bottom) ---
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(150, 150, 150);

  const footer =
    "Preview only • Unlock full tax plan to download without watermark";
  pdf.text(footer, pageW / 2, pageH - 24, {
    align: "center",
  });

  // Reset to something sane so the caller doesn't inherit watermark styling
  pdf.setTextColor(20, 20, 20);
  pdf.setFontSize(prevFontSize);
}
