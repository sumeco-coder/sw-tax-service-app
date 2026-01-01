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

  if (!me) redirect("/admin/sign-in");
  if (me.role !== "ADMIN") redirect("/not-authorized");

  return <AdminShell>{children}</AdminShell>;
}
