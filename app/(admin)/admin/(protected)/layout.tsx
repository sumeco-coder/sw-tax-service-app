// app/(admin)/admin/(protected)/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AdminShell from "./_components/AdminShell";
import { getServerRole } from "@/lib/auth/roleServer";

function isAdminLike(roleRaw: unknown) {
  const role = String(roleRaw ?? "").toLowerCase();
  return role === "admin" || role === "superadmin" || role === "support_agent";
}
export default async function AdminProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const me = await getServerRole();

  if (!me?.sub) redirect("/admin/sign-in");

  if (!isAdminLike(me.role)) redirect("/not-authorized");

  return <AdminShell>{children}</AdminShell>;
}
