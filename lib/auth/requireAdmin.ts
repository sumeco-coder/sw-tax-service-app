import { getServerUser } from "@/lib/auth/getServerUser";

export async function requireAdmin() {
  const me = await getServerUser();
  if (!me) return null;

  const role = String(me.role ?? "").toUpperCase();
  if (role === "ADMIN" || role === "SUPERADMIN") return me;

  return null;
}
