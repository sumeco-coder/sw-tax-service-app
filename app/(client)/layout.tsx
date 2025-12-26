// app/(client)/layout.tsx
import { redirect } from "next/navigation";
import ClientShell from "./_components/ClientShell";
import { getServerRole } from "@/lib/auth/roleServer";

export const dynamic = "force-dynamic";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const me = await getServerRole();
  if (!me) redirect("/sign-in");

  const role = String(me.role ?? "").toLowerCase();

  const allowed = role === "taxpayer" || role === "admin" || role === "superadmin";
  if (!allowed) redirect("/not-authorized");

  return <ClientShell isAdmin={role === "admin" || role === "superadmin"}>{children}</ClientShell>;
}
