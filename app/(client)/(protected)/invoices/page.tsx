import Link from "next/link";
import { db } from "@/drizzle/db";
import { invoices } from "@/drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { requireClientUser } from "@/lib/auth/requireClientUser.server";

function money(amount: unknown) {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function fmtDate(d: unknown) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(String(d));
  return Number.isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("en-US");
}

export default async function InvoicesPage() {
  const { user } = await requireClientUser();

  const rows = await db
    .select({
      id: invoices.id,
      amount: invoices.amount,
      status: invoices.status,
      issuedAt: invoices.issuedAt,
      paidAt: invoices.paidAt,
      taxReturnId: invoices.taxReturnId,
    })
    .from(invoices)
    .where(eq(invoices.userId, user.id))
    .orderBy(desc(invoices.issuedAt));

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            View invoices and submit payment for review.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-2xl border p-6 text-sm text-muted-foreground">
            No invoices yet.
          </div>
        ) : (
          rows.map((inv) => (
            <Link
              key={String(inv.id)}
              href={`/invoices/${inv.id}`}
              className="block rounded-2xl border p-4 hover:bg-muted/40"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    Invoice #{String(inv.id).slice(0, 8)}
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Status: <span className="font-medium">{String(inv.status)}</span>
                    {inv.issuedAt ? ` • Issued ${fmtDate(inv.issuedAt)}` : ""}
                    {inv.paidAt ? ` • Paid ${fmtDate(inv.paidAt)}` : ""}
                  </div>

                  {inv.taxReturnId ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Return: {String(inv.taxReturnId).slice(0, 8)}
                    </div>
                  ) : null}
                </div>

                <div className="shrink-0 text-right">
                  <div className="font-semibold">{money(inv.amount)}</div>
                  <div className="text-xs text-muted-foreground">
                    {inv.status === "PAID" ? "Closed" : "Open"}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
