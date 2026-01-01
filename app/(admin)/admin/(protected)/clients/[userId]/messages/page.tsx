// app/(admin)/admin/(protected)/clients/[userId]/messages/page.tsx
import { redirect } from "next/navigation";
import { getServerRole } from "@/lib/auth/roleServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminClientMessagesRedirect({
  params,
}: {
  params: { userId: string };
}) {
  const auth = await getServerRole();
  if (!auth) return redirect("/admin/sign-in");

  const isAdmin =
    auth.role === "ADMIN" ||
    auth.role === "LMS_ADMIN" ||
    auth.role === "LMS_PREPARER";
  if (!isAdmin) return redirect("/admin");

  // ✅ Send to your admin messages page (we’ll make it filter/select by clientId next)
  return redirect(`/admin/messages?clientId=${params.userId}`);
}
