// app/(admin)/admin/(protected)/clients/[userId]/documents/request/actions.ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";

function requireAdminOrRedirect(role: unknown) {
  const r = String(role ?? "").toUpperCase();
  const ok = ["ADMIN", "SUPERADMIN", "LMS_ADMIN", "LMS_PREPARER"].includes(r);
  if (!ok) redirect("/admin");
}

export async function getClientBasics(userId: string) {
  const auth = await getServerRole();
  if (!auth) redirect("/admin/sign-in");
  requireAdminOrRedirect(auth.role);

  const [u] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!u) throw new Error("Client not found.");
  return u;
}

const PreviewSchema = z.object({
  items: z.array(z.string()).default([]),
  due: z.string().optional().default(""),
  note: z.string().optional().default(""),
});

export async function redirectToRequestPreview(userId: string, formData: FormData) {
  const auth = await getServerRole();
  if (!auth) redirect("/admin/sign-in");
  requireAdminOrRedirect(auth.role);

  const items = formData.getAll("items").map((v) => String(v));
  const due = String(formData.get("due") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  const parsed = PreviewSchema.safeParse({ items, due, note });
  const data = parsed.success ? parsed.data : { items, due, note };

  const params = new URLSearchParams();
  if (data.items.length) params.set("items", data.items.join(","));
  if (data.due) params.set("due", data.due);
  if (data.note) params.set("note", data.note);

  const qs = params.toString();
  redirect(
    qs
      ? `/admin/clients/${userId}/documents/request?${qs}`
      : `/admin/clients/${userId}/documents/request`
  );
}
