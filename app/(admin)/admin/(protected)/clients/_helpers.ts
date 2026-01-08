// app/(admin)/admin/(protected)/clients/_helpers.ts
import "server-only";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerRole } from "@/lib/auth/roleServer";

export async function requireAdminOrRedirect() {
  const auth = await getServerRole();
  if (!auth) redirect("/admin/sign-in");

  const isAdmin =
    auth.role === "ADMIN" ||
    auth.role === "SUPERADMIN" ||
    auth.role === "LMS_ADMIN" ||
    auth.role === "LMS_PREPARER";

  if (!isAdmin) redirect("/admin");
  return auth;
}

export function revalidateClientPaths(userId: string) {
  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${userId}`);

  // Add only routes you actually have:
  revalidatePath(`/admin/clients/${userId}/edit`);
  revalidatePath(`/admin/clients/${userId}/documents`);
  revalidatePath(`/admin/clients/${userId}/dependents`);
  revalidatePath(`/admin/clients/${userId}/business`);
  revalidatePath(`/admin/clients/${userId}/notices`);
  revalidatePath(`/admin/clients/${userId}/next-steps`);
  revalidatePath(`/admin/clients/${userId}/messages`);
}
