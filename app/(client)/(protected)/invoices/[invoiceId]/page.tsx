// app/(client)/(protected)/invoices/[invoiceId]/page.tsx
import { notFound } from "next/navigation";
import { db } from "@/drizzle/db";
import { invoices, invoicePayments } from "@/drizzle/schema";
import { and, desc, eq } from "drizzle-orm";
import { requireClientUser } from "@/lib/auth/requireClientUser.server";
import PaymentSubmitForm from "./payment-submit-form";

function money(amount: unknown) {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtDate(d: unknown) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(String(d));
  return Number.isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("en-US");
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const { user } = await requireClientUser();

  const [inv] = await db
    .select({
      id: invoices.id,
      userId: invoices.userId,
      taxReturnId: invoices.taxReturnId,
      amount: invoices.amount,
      status: invoices.status,
      issuedAt: invoices.issuedAt,
      paidAt: invoices.paidAt,
    })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, user.id)))
    .limit(1);

  if (!inv) return notFound();

  const payments = await db
    .select({
      id: invoicePayments.id,
      method: invoicePayments.method,
      amount: invoicePayments.amount,
      paidOn: invoicePayments.paidOn,
      reference: invoicePayments.reference,
      receiptKey: invoicePayments.receiptKey,
      notes: invoicePayments.notes,
      status: invoicePayments.status,
      createdAt: invoicePayments.createdAt,
    })
    .from(invoicePayments)
    .where(and(eq(invoicePayments.invoiceId, invoiceId), eq(invoicePayments.userId, user.id)))
    .orderBy(desc(invoicePayments.createdAt));

  const latest = payments[0];
  const hasSubmitted = payments.some((p) => p.status === "submitted");

  // Treat as pending if invoice says PAYMENT_SUBMITTED OR if there is a submitted payment row
  const isPaid = inv.status === "PAID";
  const isPending = inv.status === "PAYMENT_SUBMITTED" || (inv.status === "UNPAID" && hasSubmitted);

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <div className="rounded-2xl border p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold">
              Invoice #{String(inv.id).slice(0, 8)}
            </h1>

            <p className="text-sm text-muted-foreground">
              Status:{" "}
              <span className="font-medium">
                {isPending ? "PAYMENT_SUBMITTED" : String(inv.status)}
              </span>
              {inv.issuedAt ? ` • Issued ${fmtDate(inv.issuedAt)}` : ""}
              {inv.paidAt ? ` • Paid ${fmtDate(inv.paidAt)}` : ""}
            </p>

            {inv.taxReturnId ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Return: {String(inv.taxReturnId).slice(0, 8)}
              </p>
            ) : null}
          </div>

          <div className="shrink-0 text-right">
            <div className="text-2xl font-bold">{money(inv.amount)}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {isPaid ? (
          <div className="rounded-2xl border p-5 text-sm">
            ✅ Payment has been approved and marked as paid.
          </div>
        ) : isPending ? (
          <div className="rounded-2xl border p-5 text-sm">
            ⏳ Payment submitted{latest?.paidOn ? ` (Paid on ${latest.paidOn})` : ""}. We’ll review it shortly.
          </div>
        ) : (
          <div className="rounded-2xl border p-5">
            <h2 className="text-lg font-semibold">Submit payment</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the details of the payment you already made (Zelle/Cash App/etc.). We’ll verify and approve it.
            </p>

            <div className="mt-4">
              {/* numeric comes back as string often; pass as string */}
              <PaymentSubmitForm invoiceId={invoiceId} defaultAmount={String(inv.amount)} />
            </div>
          </div>
        )}

        {payments.length > 0 ? (
          <div className="rounded-2xl border p-5">
            <h3 className="font-semibold">Payment history</h3>

            <div className="mt-3 space-y-2 text-sm">
              {payments.map((p) => (
                <div key={String(p.id)} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate">
                      <span className="font-medium">{p.method}</span> • {money(p.amount)} • Paid on {p.paidOn}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Status: <span className="font-medium">{p.status}</span>
                      {p.reference ? ` • Ref: ${p.reference}` : ""}
                    </div>

                    {p.notes ? (
                      <div className="mt-1 text-xs text-muted-foreground truncate">
                        Notes: {p.notes}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
