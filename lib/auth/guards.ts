import { redirect } from "next/navigation";
import type { AppRole } from "./roleClient";
import { getServerRole } from "./roleServer";

type GuardOptions = {
  redirectTo?: string;        // where to send if NOT signed in
  notAuthorizedTo?: string;   // where to send if signed in but wrong role
  allowAdmin?: boolean;       // admin can pass any portal gate
};

export async function requireAuth(options: GuardOptions = {}) {
  const roleInfo = await getServerRole();

  if (!roleInfo) redirect(options.redirectTo ?? "/sign-in");

  return roleInfo; // { id, email, role, groups, payload }
}

export async function requireRole(
  allowed: AppRole[],
  options: GuardOptions = {},
) {
  const roleInfo = await requireAuth(options);

  const allowAdmin = options.allowAdmin ?? true;
  const ok =
    allowed.includes(roleInfo.role) ||
    (allowAdmin && roleInfo.role === "admin");

  if (!ok) redirect(options.notAuthorizedTo ?? "/not-authorized");

  return roleInfo;
}

export async function requireAdmin(options: GuardOptions = {}) {
  return requireRole(["admin"], {
    redirectTo: options.redirectTo ?? "/admin/sign-in",
    notAuthorizedTo: options.notAuthorizedTo ?? "/not-authorized",
    allowAdmin: false,
  });
}
