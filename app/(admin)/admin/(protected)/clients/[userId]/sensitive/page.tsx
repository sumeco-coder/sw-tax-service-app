// app/(admin)/admin/(protected)/clients/[userId]/sensitive/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerRole } from "@/lib/auth/roleServer";
import SensitiveClientInfo from "../_components/SensitiveClientInfo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminClientSensitivePage({
  params,
}: {
  params: { userId: string };
}) {
  const me = await getServerRole();
  if (!me?.sub) redirect("/admin/sign-in");

  const role = String(me?.role ?? "").toUpperCase();

  const isAdmin = ["ADMIN", "SUPERADMIN", "LMS_ADMIN", "LMS_PREPARER"].includes(role);
  if (!isAdmin) redirect("/not-authorized");

  const canReveal = ["ADMIN", "SUPERADMIN"].includes(role);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            className="text-sm underline underline-offset-4"
            href={`/admin/clients/${params.userId}/documents`}
          >
            ← Back to Documents
          </Link>
          <h1 className="mt-2 text-xl font-bold">Sensitive Info</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            SSN + Direct Deposit (masked by default)
          </p>
        </div>
      </div>

      <SensitiveClientInfo userId={params.userId} canReveal={canReveal} />
    </div>
  );
}
