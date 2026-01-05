// app/(client)/(protected)/(app)/layout.tsx
import { redirect } from "next/navigation";
import { getServerRole } from "@/lib/auth/roleServer";
import ClientShell from "../_components/ClientShell";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getServerRole();
  if (!me?.sub) redirect("/sign-in");

  const role = String(me.role ?? "").toLowerCase();

  const allowed =
    role === "taxpayer" ||
    role === "admin" ||
    role === "superadmin" ||
    role === "lms_admin" ||
    role === "lms_preparer" ||
    role === "lms-admin" ||
    role === "lms-preparer";

  if (!allowed) redirect("/not-authorized");

  return <ClientShell>{children}</ClientShell>;
}
