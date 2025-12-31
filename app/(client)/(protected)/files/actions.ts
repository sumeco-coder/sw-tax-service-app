// app/(client)/files/actions.ts
"use server";

import { getServerRole } from "@/lib/auth/roleServer";
import {
  listDocuments as listDocsFromOnboarding,
  deleteDocument as deleteDocFromOnboarding,
} from "../onboarding/documents/actions";

// ✅ current-user only (no client-passed sub)
export async function listMyDocuments() {
  const me = await getServerRole();
  if (!me?.sub) throw new Error("Unauthorized");
  return listDocsFromOnboarding(me.sub);
}

export async function deleteMyDocument(docId: string) {
  const me = await getServerRole();
  if (!me?.sub) throw new Error("Unauthorized");
  return deleteDocFromOnboarding(docId, me.sub);
}
