//app/(admin)/admin/(protected)/clients/[userId]/edit/actions.ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

function clean(v: unknown, max = 255) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : null;
}

export async function updateClientProfile(formData: FormData) {
  const auth = await getServerRole();
  if (!auth) redirect("/admin/sign-in");

  const isAdmin =
    auth.role === "ADMIN" ||
    auth.role === "LMS_ADMIN" ||
    auth.role === "LMS_PREPARER";
  if (!isAdmin) redirect("/admin");

  const userId = String(formData.get("userId") ?? "");
  if (!userId) redirect("/admin/clients");

  await db
    .update(users)
    .set({
      name: clean(formData.get("name"), 255),
      phone: clean(formData.get("phone"), 50),
      address1: clean(formData.get("address1"), 255),
      address2: clean(formData.get("address2"), 255),
      city: clean(formData.get("city"), 120),
      state: clean(formData.get("state"), 20),
      zip: clean(formData.get("zip"), 20),
      adminNotes: clean(formData.get("adminNotes"), 2000),
    })
    .where(eq(users.id, userId));

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${userId}/edit`);

  redirect(`/admin/clients/${userId}/edit`);
}
