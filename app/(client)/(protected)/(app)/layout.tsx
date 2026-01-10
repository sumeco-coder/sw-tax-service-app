// app/(client)/(protected)/(app)/layout.tsx
import { redirect } from "next/navigation";
import { getServerRole } from "@/lib/auth/roleServer";
import ClientShell from "../_components/ClientShell";
import type { AppRole } from "@/lib/auth/types";

export const dynamic = "force-dynamic";

/** All roles your app recognizes (from AppRole union) */
const ROLE_SET = new Set<AppRole>([
  "TAXPAYER",
  "AGENCY",
  "ADMIN",
  "SUPERADMIN",
  "LMS_PREPARER",
  "LMS_ADMIN",
  "TAX_PREPARER",
  "SUPPORT_AGENT",
]);

/** Roles allowed to access the Client Portal layout */
const CLIENT_PORTAL_ALLOWED = new Set<AppRole>([
  "TAXPAYER",
  "ADMIN",
  "SUPERADMIN",
  "SUPPORT_AGENT",
  "LMS_ADMIN",
  "LMS_PREPARER",
  // add these ONLY if you want them in the client portal:
  // "AGENCY",
  // "TAX_PREPARER",
]);

function parseRole(value: unknown): AppRole | null {
  const r = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/-/g, "_"); // "lms-admin" -> "LMS_ADMIN"

  return ROLE_SET.has(r as AppRole) ? (r as AppRole) : null;
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getServerRole();
  if (!me?.sub) redirect("/sign-in");

  const role = parseRole(me.role);
  if (!role) redirect("/not-authorized");
  if (!CLIENT_PORTAL_ALLOWED.has(role)) redirect("/not-authorized");

  const isAdmin =
    role === "ADMIN" || role === "SUPERADMIN" || role === "SUPPORT_AGENT";

  return <ClientShell isAdmin={isAdmin}>{children}</ClientShell>;
}
