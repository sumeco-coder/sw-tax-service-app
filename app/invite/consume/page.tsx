import { redirect } from "next/navigation";
import { db } from "@/drizzle/db";
import { invites } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function safeInternalPath(input: unknown, fallback: string) {
  const raw = String(input ?? "").trim();
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  return raw;
}

function buildUrl(path: string, params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const qs = sp.toString();
  return `${path}${qs ? `?${qs}` : ""}`;
}

export default async function InviteConsumePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const token =
    (typeof searchParams.token === "string" ? searchParams.token : "")?.trim() ||
    (typeof searchParams.invite === "string" ? searchParams.invite : "")?.trim();

  if (!token) {
    const next = safeInternalPath(searchParams.next, "/");
    redirect(buildUrl("/invite", { error: "missing_invite", next }));
  }

  const [row] = await db
    .select({
      id: invites.id,
      token: invites.token,
      status: invites.status,
      type: invites.type,
      email: invites.email,
      expiresAt: invites.expiresAt,
      agencyId: invites.agencyId,
      meta: invites.meta, // ✅ needed to detect admin-created invites
    })
    .from(invites)
    .where(eq(invites.token, token))
    .limit(1);

  if (!row) {
    const next = safeInternalPath(searchParams.next, "/");
    redirect(buildUrl("/invite", { error: "invalid_invite", next }));
  }

  const now = new Date();
  const isExpired = !!row.expiresAt && row.expiresAt.getTime() < now.getTime();

  if (isExpired && row.status === "pending") {
    await db
      .update(invites)
      .set({ status: "expired", updatedAt: now })
      .where(eq(invites.id, row.id));
  }

  if (row.status === "revoked" || row.status === "expired" || isExpired) {
    redirect(buildUrl("/sign-in", { error: "invite_expired", email: row.email }));
  }

  const defaultNext =
    row.type === "taxpayer"
      ? "/onboarding/profile"
      : row.type === "lms-preparer"
        ? "/agency"
        : "/dashboard";

  const next = safeInternalPath(searchParams.next, defaultNext);

  // ✅ If already accepted, just sign in normally
  if (row.status === "accepted") {
    redirect(buildUrl("/sign-in", { next, email: row.email }));
  }

  // ✅ Pending invite routing:
  // - Admin-created invites: go to set-password flow (Branded Resend)
  // - Campaign taxpayer invites: go to onboarding sign-up flow
  const invitedBy = String((row.meta as any)?.invitedBy ?? "").toLowerCase();
  const isAdminInvite = invitedBy === "admin";

  if (row.status === "pending") {
    if (isAdminInvite) {
      // Branded Resend flow -> set password first
      redirect(
        buildUrl("/sign-in", {
          start: "setpw",
          invite: token,
          next,
          email: row.email,
        }),
      );
    }

    // Campaign (or non-admin) taxpayer invites -> onboarding sign-up
    if (row.type === "taxpayer") {
      redirect(
        buildUrl("/taxpayer/onboarding-sign-up", {
          invite: token,
          next,
          agencyId: row.agencyId ?? undefined,
          email: row.email, // prefill
        }),
      );
    }

    // fallback for other types
    redirect(buildUrl("/sign-in", { invite: token, next, email: row.email }));
  }

  // safety fallback
  redirect(buildUrl("/sign-in", { next, email: row.email }));
}
