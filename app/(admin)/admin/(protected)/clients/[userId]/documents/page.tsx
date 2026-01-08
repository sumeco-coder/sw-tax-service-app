// app/(admin)/admin/(protected)/clients/[userId]/documents/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";

import { getServerRole } from "@/lib/auth/roleServer";

// ✅ Prefer alias import instead of deep ../../.. (less fragile)
import DocumentsClient from "@/app/(client)/(protected)/(app)/documents/_components/DocumentsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminClientDocumentsPage({
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

          <Link
            href={`/admin/clients/${userId}/documents/request`}
            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90"
          >
            <Send className="h-4 w-4" />
            Request docs
          </Link>
        </div>

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
