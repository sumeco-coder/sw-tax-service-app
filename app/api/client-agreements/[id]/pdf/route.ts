import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db } from "@/drizzle/db";
import { clientAgreements } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";
import { Buffer } from "buffer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmtDate(d: unknown) {
  try {
    if (!d) return "—";
    const dt = d instanceof Date ? d : new Date(String(d));
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleString("en-US");
  } catch {
    return "—";
  }
}

function wrapText(text: string, font: any, fontSize: number, maxWidth: number) {
  const words = String(text ?? "").split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(test, fontSize);
    if (width <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const me = await getServerRole();
  if (!me?.sub) return new NextResponse("Unauthorized", { status: 401 });

  // ✅ Access control: admin-like OR owner of agreement
  const role = String(me.role ?? "").toLowerCase();
  const isAdminLike =
    role === "admin" || role === "superadmin" || role === "support_agent";

  const agreementId = params.id;

  const rows = await db
    .select()
    .from(clientAgreements)
    .where(eq(clientAgreements.id, agreementId))
    .limit(1);

  const ag = rows[0];
  if (!ag) return new NextResponse("Not found", { status: 404 });

  if (!isAdminLike && String(ag.userId) !== String(me.sub)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // ✅ Build PDF
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([612, 792]); // Letter
  const { width, height } = page.getSize();

  const margin = 48;
  const maxWidth = width - margin * 2;

  let y = height - margin;

  const draw = (text: string, size: number, bold = false) => {
    const f = bold ? fontBold : font;
    page.drawText(text, { x: margin, y, size, font: f, color: rgb(0, 0, 0) });
    y -= size + 6;
  };

  draw("SW Tax Service", 14, true);
  draw("Client Agreement Receipt", 18, true);
  y -= 6;

  draw(`Agreement ID: ${ag.id}`, 10);
  draw(`Tax Year: ${ag.taxYear}`, 10);
  draw(`Kind: ${String(ag.kind)}`, 10);
  draw(`Version: ${ag.version}`, 10);
  draw(`Content Hash: ${ag.contentHash}`, 10);
  draw(`Decision: ${String(ag.decision)}`, 10);
  draw(`Tax Return ID: ${ag.taxReturnId ?? "—"}`, 10);
  y -= 8;

  draw("Signatures", 12, true);
  draw(`Taxpayer Name: ${ag.taxpayerName}`, 11);
  draw(`Taxpayer Signed At: ${fmtDate(ag.taxpayerSignedAt)}`, 11);

  draw(`Spouse Required: ${ag.spouseRequired ? "Yes" : "No"}`, 11);
  draw(`Spouse Name: ${ag.spouseName ?? "—"}`, 11);
  draw(`Spouse Signed At: ${fmtDate(ag.spouseSignedAt)}`, 11);
  y -= 8;

  draw("Audit", 12, true);
  draw(`IP: ${ag.ip ?? "—"}`, 10);

  // userAgent might be long → wrap it
  const uaLines = wrapText(
    `User Agent: ${ag.userAgent ?? "—"}`,
    font,
    10,
    maxWidth,
  );
  for (const line of uaLines) draw(line, 10);

  y -= 8;
  const noteLines = wrapText(
    "This PDF confirms the agreement record captured by the system, including signer identity fields, timestamps, and version/hash for verification.",
    font,
    10,
    maxWidth,
  );
  for (const line of noteLines) draw(line, 10);

  const pdfBytes = await pdfDoc.save();
  const filename = `agreement-${ag.taxYear}-${String(ag.kind).toLowerCase()}-${ag.id}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
