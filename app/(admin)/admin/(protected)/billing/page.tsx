// app/(admin)/admin/(protected)/billing/page.tsx
import { redirect } from "next/navigation";
import { getServerRole } from "@/lib/auth/roleServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminBillingPage() {
  const auth = await getServerRole();
  if (!auth) redirect("/admin/sign-in");

  const role = String(auth.role ?? "");
  const isAdmin =
    role === "ADMIN" ||
    role === "SUPERADMIN" ||
    role === "LMS_ADMIN" ||
    role === "LMS_PREPARER";

  if (!isAdmin) redirect("/admin");

  return (
    <main className="min-h-dvh bg-background px-3 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Billing</h1>
          <p className="text-muted-foreground">
            Manage invoices, payments, and billing settings.
          </p>
        </header>

        <section className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">
            This page is not wired up yet.
          </p>
        </section>
      </div>
    </main>
  );
}
