// app/(admin)/admin/(protected)/clients/[userId]/documents/actions.ts
"use server";

import { db } from "@/drizzle/db";
import { documents } from "@/drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

function requireAdmin() {
  return getServerRole().then((server) => {
    const role = String(server?.role ?? "").toLowerCase();
    const ok = ["admin", "superadmin", "lms_admin", "lms_preparer"].includes(role);
    if (!ok) throw new Error("Forbidden.");
    return server;
  });
}

export async function adminListDocuments(userId: string) {
  await requireAdmin();

  return db
    .select()
    .from(documents)
    .where(eq(documents.userId, userId))
    .orderBy(desc(documents.uploadedAt));
}

export async function adminDeleteDocument(userId: string, docId: string) {
  await requireAdmin();

  // make sure doc belongs to that client
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, docId), eq(documents.userId, userId)))
    .limit(1);

  if (!doc) throw new Error("Document not found.");

  // if you also delete from S3, do it here (deleteFromS3(doc.key))
  await db.delete(documents).where(eq(documents.id, docId));

  return { ok: true };
}
