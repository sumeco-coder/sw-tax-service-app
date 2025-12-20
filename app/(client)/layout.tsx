// app/(client)/layout.tsx
import { redirect } from "next/navigation";
import ClientShell from "./_components/ClientShell";
import { getServerRole } from "@/lib/auth/roleServer";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const me = await getServerRole();

  if (!me) redirect("/sign-in");

  const allowed = me.role === "taxpayer" || me.role === "admin";
  if (!allowed) redirect("/not-authorized");

  return <ClientShell isAdmin={me.role === "admin"}>{children}</ClientShell>;
}
