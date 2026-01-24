// app/(admin)/admin/(protected)/billing/page.tsx
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { getServerRole } from "@/lib/auth/roleServer";
import { db } from "@/drizzle/db";
import { invoices, invoicePayments } from "@/drizzle/schema";
import BillingClient from "./_components/BillingClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function iso(v: unknown) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toYmd(v: unknown) {
  if (!v) return null;
  // pg date sometimes comes as string 'YYYY-MM-DD'
  if (typeof v === "string") return v;
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

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

  // ✅ Relational query (recommended)
  const rows = await db.query.invoices.findMany({
    orderBy: [desc(invoices.issuedAt)],
    limit: 100,
    with: {
      payments: {
        orderBy: [desc(invoicePayments.createdAt)],
      },
    },
  });

  // ✅ JSON-safe mapping (Dates -> strings; numeric stays string)
  const safeInvoices = rows.map((inv) => ({
    id: inv.id,
    userId: inv.userId,
    taxReturnId: inv.taxReturnId,
    amount: String(inv.amount), // numeric -> string
    status: inv.status, // UNPAID/PAID/...
    issuedAt: iso(inv.issuedAt),
    paidAt: iso(inv.paidAt),
    payments: inv.payments.map((p) => ({
      id: p.id,
      invoiceId: p.invoiceId,
      userId: p.userId,
      method: p.method,
      amount: String(p.amount),
      paidOn: toYmd(p.paidOn),
      reference: p.reference ?? null,
      receiptKey: p.receiptKey ?? null,
      notes: p.notes ?? null,
      status: p.status, // submitted/approved/rejected
      createdAt: iso(p.createdAt),
    })),
  }));

  return (
    <main className="min-h-dvh bg-background px-3 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Billing</h1>
          <p className="text-muted-foreground">
            Manage invoices, payments, and billing settings.
          </p>
        </header>

        <BillingClient invoices={safeInvoices} />
      </div>
    </main>
  );
}
