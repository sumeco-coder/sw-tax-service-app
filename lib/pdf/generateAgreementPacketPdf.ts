// lib/pdf/generateAgreementPacketPdf.ts
import "server-only";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { AGREEMENT_TITLES, AGREEMENT_TEXT, AgreementKind } from "@/lib/legal/agreements";

type SignedRow = {
  kind: AgreementKind;
  version: string | null;
  contentHash: string | null;
  decision: string | null;

  taxpayerName: string | null;
  taxpayerSignedAt: Date | null;

  spouseRequired: boolean | null;
  spouseName: string | null;
  spouseSignedAt: Date | null;

  ip: string | null;
  userAgent: string | null;
};

function wrapText(text: string, maxWidth: number, font: any, size: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(test, size);
    if (width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function safe(s: unknown) {
  return String(s ?? "").trim();
}

export async function buildSignedAgreementsPdf(args: {
  taxYear: string;
  rowsByKind: Record<string, SignedRow | null>;
  kinds: readonly AgreementKind[];
  generatedAt?: Date;
}) {
  const generatedAt = args.generatedAt ?? new Date();

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 612; // US Letter
  const PAGE_H = 792;
  const M = 48; // margin
  const LINE = 14;

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - M;

  const maxWidth = PAGE_W - M * 2;

  function newPage() {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - M;
  }

  function drawLine(text: string, size = 11, isBold = false) {
    if (y < M + 40) newPage();
    page.drawText(text, {
      x: M,
      y,
      size,
      font: isBold ? bold : font,
    });
    y -= LINE;
  }

  function drawParagraph(text: string, size = 11) {
    const cleaned = safe(text).replace(/\r\n/g, "\n");
    const paras = cleaned.split("\n\n");

    for (const p of paras) {
      const lines = wrapText(p.replace(/\s+/g, " ").trim(), maxWidth, font, size);
      for (const ln of lines) drawLine(ln, size, false);
      y -= 6; // space between paragraphs
    }
  }

  // ---------- Header ----------
  drawLine("SW Tax Service — Signed Agreements Packet", 16, true);
  drawLine(`Tax Year: ${args.taxYear}`, 11, false);
  drawLine(`Generated: ${generatedAt.toLocaleString()}`, 11, false);
  y -= 10;

  // ---------- Sections ----------
  for (const kind of args.kinds) {
    if (y < M + 160) newPage();

    const title = AGREEMENT_TITLES[kind] ?? kind;
    const text = AGREEMENT_TEXT[kind] ?? "";

    const row = args.rowsByKind[kind] ?? null;

    drawLine("────────────────────────────────────────────────────────", 11, false);
    drawLine(title, 14, true);

    drawLine(`Kind: ${kind}`, 11, false);
    drawLine(`Decision: ${safe(row?.decision || "N/A")}`, 11, false);
    drawLine(`Version: ${safe(row?.version || "N/A")}`, 11, false);
    drawLine(`Content hash: ${safe(row?.contentHash || "N/A")}`, 11, false);

    y -= 6;

    drawLine(`Taxpayer name: ${safe(row?.taxpayerName || "")}`, 11, false);
    drawLine(
      `Taxpayer signed: ${row?.taxpayerSignedAt ? new Date(row.taxpayerSignedAt).toLocaleString() : "Not signed"}`,
      11,
      false
    );

    const spouseReq = Boolean(row?.spouseRequired);
    if (spouseReq) {
      drawLine(`Spouse required: YES`, 11, false);
      drawLine(`Spouse name: ${safe(row?.spouseName || "")}`, 11, false);
      drawLine(
        `Spouse signed: ${row?.spouseSignedAt ? new Date(row.spouseSignedAt).toLocaleString() : "NOT signed"}`,
        11,
        false
      );
    } else {
      drawLine(`Spouse required: NO`, 11, false);
    }

    y -= 8;

    // audit (small)
    const ip = safe(row?.ip);
    const ua = safe(row?.userAgent);
    if (ip || ua) {
      drawLine("Audit trail (captured at signing):", 10, true);
      if (ip) drawLine(`IP: ${ip}`, 10, false);
      if (ua) drawLine(`User-Agent: ${ua.slice(0, 120)}${ua.length > 120 ? "…" : ""}`, 10, false);
      y -= 6;
    }

    drawLine("Agreement text:", 11, true);
    y -= 6;
    drawParagraph(text, 11);

    y -= 14;
  }

  return await pdf.save(); // Uint8Array
}
