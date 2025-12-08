// app/(main)/files/actions.ts
"use server";

import {
  listDocuments as listDocsFromOnboarding,
  deleteDocument as deleteDocFromOnboarding,
} from "@/app/(client)/onboarding/documents/actions";

// Just re-export with clearer names for "My Files" page

export async function listMyDocuments(cognitoSub: string) {
  return listDocsFromOnboarding(cognitoSub);
}

export async function deleteMyDocument(docId: string, cognitoSub: string) {
  return deleteDocFromOnboarding(docId, cognitoSub);
}
