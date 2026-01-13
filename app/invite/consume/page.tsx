// app/invite/consume/page.tsx
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
    redirect(buildUrl("/sign-in", { error: "missing_invite" }));
  }

  const [row] = await db
    .select({
      id: invites.id,
      token: invites.token,
      status: invites.status,
      type: invites.type,
      expiresAt: invites.expiresAt,
    })
    .from(invites)
    .where(eq(invites.token, token))
    .limit(1);

  if (!row) {
    redirect(buildUrl("/sign-in", { error: "invalid_invite" }));
  }

  const now = new Date();
  const isExpired = !!row.expiresAt && row.expiresAt.getTime() < now.getTime();

  // If expired but still "pending", mark it expired (optional but clean)
  if (isExpired && row.status === "pending") {
    await db
      .update(invites)
      .set({ status: "expired", updatedAt: now })
      .where(eq(invites.id, row.id));
  }

  // Hard block revoked/expired
  if (row.status === "revoked" || row.status === "expired" || isExpired) {
    redirect(buildUrl("/sign-in", { error: "invite_expired" }));
  }

  // Decide default next based on invite type (adjust if you want)
   // Decide default next based on invite type
  const defaultNext =
    row.type === "taxpayer" ? "/onboarding/profile" : "/dashboard";

  const next = safeInternalPath(searchParams.next, defaultNext);

  // If already accepted, invite isn't needed anymore
  if (row.status === "accepted") {
    redirect(buildUrl("/sign-in", { next }));
  }

  // ✅ KEY CHANGE:
  // If taxpayer + pending -> go to onboarding sign-up page (NOT /sign-in)
  if (row.type === "taxpayer" && row.status === "pending") {
    redirect(
      buildUrl("/taxpayer/onboarding-sign-up", {
        invite: token,
        next,
      })
    );
  }

  // Otherwise keep your existing behavior
  redirect(buildUrl("/sign-in", { invite: token, next }));

}
