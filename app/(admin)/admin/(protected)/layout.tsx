// app/(admin)/admin/(protected)/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AdminShell from "./_components/AdminShell";
import { getServerRole } from "@/lib/auth/roleServer";

export default async function AdminProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const me = await getServerRole();

  if (!me?.sub) redirect("/admin/sign-in");

  const role = String(me.role ?? "").toLowerCase();

  if (role !== "admin") redirect("/not-authorized");

  return <AdminShell>{children}</AdminShell>;
}
