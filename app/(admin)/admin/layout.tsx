import { redirect } from "next/navigation";
import { getServerRole } from "@/lib/auth/roleServer";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getServerRole();

  if (!me?.sub) redirect("/admin/sign-in");

  const role = String(me.role ?? "").toLowerCase();
  if (role !== "admin") redirect("/not-authorized");

  return <>{children}</>;
}
