// app(admin)/admin/(protected)/clients/[userId]/documents/page
import { redirect } from "next/navigation";
import { getServerRole } from "@/lib/auth/roleServer";
import DocumentsClient from "../../../../../../(client)/(protected)/(app)/documents/_components/DocumentsClient"

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminClientDocumentsPage({
  params,
}: {
  params: { userId: string };
}) {
  const auth = await getServerRole();
  if (!auth) return redirect("/admin/sign-in");

  const isAdmin =
    auth.role === "ADMIN" || auth.role === "LMS_ADMIN" || auth.role === "LMS_PREPARER";
  if (!isAdmin) return redirect("/admin");

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <DocumentsClient targetUserId={params.userId} mode="admin" />
      </div>
    </main>
  );
}
