import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/drizzle/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";

import FilesClient from "@/app/(client)/(protected)/_components/FilesClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminClientFilesPage({
  params,
}: {
  params: { userId: string };
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

  const [u] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!u?.email) notFound();

  return (
    <main className="min-h-dvh bg-background px-3 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/clients/${userId}/documents`}
            className="inline-flex h-10 items-center gap-2 rounded-2xl border bg-background px-4 text-sm font-semibold hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <div className="text-sm font-semibold text-muted-foreground">
            Client uploads (Files)
          </div>
        </div>

        <section className="rounded-3xl border bg-card shadow-sm">
          <div className="p-4 sm:p-6">
            {/* ✅ With the upgraded actions.ts, admin can pass DB userId OR cognito sub. */}
            <FilesClient targetUserIdOrSub={userId} />
          </div>
        </section>
      </div>
    </main>
  );
}
