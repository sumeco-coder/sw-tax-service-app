// app/(admin)/admin/(protected)/clients/[userId]/documents/page.tsx
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Send, KeyRound } from "lucide-react";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";
import ResendInviteButton from "../_components/ResendInviteButton";

// ✅ Import reset action from shared clients/actions.ts
import { adminResetClientPasswordFromForm } from "../../actions";

// ✅ Prefer alias import instead of deep ../../.. (less fragile)
import DocumentsClient from "@/app/(client)/(protected)/(app)/documents/_components/DocumentsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SP = Record<string, string | string[] | undefined>;

function getStr(v: unknown) {
  return typeof v === "string" ? v : "";
}

export default async function AdminClientDocumentsPage({
  params,
  searchParams,
}: {
  params: { userId: string };
  searchParams?: SP;
}) {
  const auth = await getServerRole();
  if (!auth) redirect("/admin/sign-in");

  const role = String(auth.role ?? "");
  const isAdmin =
    role === "ADMIN" ||
    role === "SUPERADMIN" ||
    role === "LMS_ADMIN" ||
    role === "LMS_PREPARER";

  if (!isAdmin) redirect("/admin");

  const userId = params.userId;

  const sp = searchParams ?? {};
  const toast = getStr(sp.toast);
  const msg = getStr(sp.msg);

  const toastText =
    toast === "pw_reset_ok"
      ? "Password reset email sent."
      : toast === "pw_reset_failed"
        ? `Reset failed: ${msg || "Unknown error"}`
        : "";

  const [u] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!u?.email) notFound();

  return (
    <main className="min-h-dvh bg-background px-3 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/admin/clients"
              className="inline-flex h-10 items-center gap-2 rounded-2xl border bg-background px-4 text-sm font-semibold hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              Clients
            </Link>

            <div className="text-sm font-semibold text-muted-foreground">
              Client documents
            </div>
          </div>

          {/* Right-side actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <ResendInviteButton email={u.email} />

            {/* ✅ Reset password */}
            <form action={adminResetClientPasswordFromForm}>
              <input type="hidden" name="email" value={String(u.email)} />
              <input
                type="hidden"
                name="returnTo"
                value={`/admin/clients/${userId}/documents`}
              />
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-2xl border bg-background px-4 text-sm font-semibold hover:bg-muted"
                title="Send Cognito reset password email"
              >
                <KeyRound className="h-4 w-4" />
                Reset password
              </button>
            </form>

            <Link
              href={`/admin/clients/${userId}/documents/request`}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90"
            >
              <Send className="h-4 w-4" />
              Request docs
            </Link>
          </div>
        </div>

        {/* ✅ Toast message */}
        {toastText ? (
          <div className="rounded-2xl border bg-background/80 px-4 py-3 text-sm">
            {toastText}
          </div>
        ) : null}

        {/* Content */}
        <section className="rounded-3xl border bg-card shadow-sm">
          <div className="p-4 sm:p-6">
            <DocumentsClient targetUserId={userId} mode="admin" />
          </div>
        </section>
      </div>
    </main>
  );
}
