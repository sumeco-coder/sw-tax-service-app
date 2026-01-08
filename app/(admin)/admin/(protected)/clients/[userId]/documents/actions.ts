// app/(admin)/admin/(protected)/clients/[userId]/documents/actions.ts
"use server";

import { db } from "@/drizzle/db";
import { documents } from "@/drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

export type AdminDocItem = {
  id: string;
  key: string;
  name: string;
  size: number;
  lastModified: string | null;
};

async function requireAdmin() {
  const server = await getServerRole();
  const role = String(server?.role ?? "").toLowerCase();

  const ok = ["admin", "superadmin", "lms_admin", "lms_preparer"].includes(role);
  if (!ok) throw new Error("Forbidden.");

  return server;
}

// GET (server action) -> list docs for a specific client (DB-backed)
export async function adminListDocuments(userId: string): Promise<AdminDocItem[]> {
  await requireAdmin();

  const rows = await db
    .select({
      id: documents.id,
      userId: documents.userId,
      key: documents.key,
      // ✅ FIX: fileName (not filename)
      fileName: documents.fileName,
      size: documents.size,
      uploadedAt: documents.uploadedAt,
      // If you have contentType in schema, you can select it too:
      // contentType: documents.contentType,
    })
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.uploadedAt));

  return rows.map((r) => ({
    id: String(r.id),
    key: String(r.key),
    name: String(r.fileName ?? "Document"),
    size: Number(r.size ?? 0),
    lastModified: r.uploadedAt ? new Date(r.uploadedAt).toISOString() : null,
  }));
}

// DELETE (server action) -> delete doc record for this client
// NOTE: This deletes the DB record. If you want to also delete from S3,
// do it here using your existing S3 helper (recommended).
export async function adminDeleteDocument(userId: string, docId: string) {
  await requireAdmin();

  // ensure the doc belongs to the target client
  const [doc] = await db
    .select({
      id: documents.id,
      key: documents.key,
    })
    .from(documents)
    .where(and(eq(documents.id, docId), eq(documents.userId, userId)))
    .limit(1);

  if (!doc) throw new Error("Document not found.");

  // ✅ delete DB record
  await db.delete(documents).where(eq(documents.id, docId));

  // ✅ optional: delete from S3 here (recommended)
  // await deleteFromS3(doc.key);

  return { ok: true, key: String(doc.key) };
}
