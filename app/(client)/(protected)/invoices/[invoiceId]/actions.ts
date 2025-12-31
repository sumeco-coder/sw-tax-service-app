"use server";

import { z } from "zod";
import { db } from "@/drizzle/db";
import { invoices, invoicePayments } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireClientUser } from "@/lib/auth/requireClientUser.server";

function clean(v: unknown, max = 500) {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, max) : "";
}

function normalizeMoney(v: unknown) {
  // accepts: 250, 250.5, 250.50, $250.50
  const s = clean(v, 30).replace(/[^0-9.]/g, "");
  if (!s) return "";
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toFixed(2); // store as "250.50" for numeric(12,2)
}

const SubmitPaymentSchema = z.object({
  method: z.string().min(2).max(50),
  amount: z.string().min(1), // normalized "123.45"
  paidOn: z.string().min(8).max(10), // YYYY-MM-DD
  reference: z.string().max(120).optional(),
  receiptKey: z.string().max(400).optional(),
  notes: z.string().max(500).optional(),
});

export async function submitInvoicePayment(invoiceId: string, formData: FormData) {
  const { user } = await requireClientUser();

  const raw = {
    method: clean(formData.get("method"), 50),
    amount: normalizeMoney(formData.get("amount")),
    paidOn: clean(formData.get("paidOn"), 10),
    reference: clean(formData.get("reference"), 120),
    receiptKey: clean(formData.get("receiptKey"), 400),
    notes: clean(formData.get("notes"), 500),
  };

  const parsed = SubmitPaymentSchema.safeParse(raw);

  if (!parsed.success || !parsed.data.amount) {
    return { ok: false as const, message: "Please check the form fields and try again." };
  }

  // Ensure invoice belongs to this user
  const [inv] = await db
    .select({
      id: invoices.id,
      userId: invoices.userId,
      status: invoices.status,
      amount: invoices.amount,
    })
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, user.id)))
    .limit(1);

  if (!inv) return { ok: false as const, message: "Invoice not found." };

  // Prevent submissions for paid/void
  if (inv.status === "PAID") return { ok: false as const, message: "This invoice is already paid." };
  if (inv.status === "VOID") return { ok: false as const, message: "This invoice is void." };

  // Prevent duplicate pending submissions
  const [existing] = await db
    .select({ id: invoicePayments.id })
    .from(invoicePayments)
    .where(
      and(
        eq(invoicePayments.invoiceId, invoiceId),
        eq(invoicePayments.userId, user.id),
        eq(invoicePayments.status, "submitted")
      )
    )
    .limit(1);

  if (existing) {
    return {
      ok: false as const,
      message: "You already submitted a payment for this invoice. Please wait for review.",
    };
  }

  // Create payment submission (id is defaultRandom(), so we can omit id)
  await db.insert(invoicePayments).values({
    invoiceId,
    userId: user.id,
    status: "submitted",
    method: parsed.data.method,
    amount: parsed.data.amount, // numeric column accepts string "123.45"
    paidOn: parsed.data.paidOn,
    reference: parsed.data.reference || null,
    receiptKey: parsed.data.receiptKey || null,
    notes: parsed.data.notes || null,
  });

  // Move invoice to PAYMENT_SUBMITTED (UPPERCASE enum)
  await db
    .update(invoices)
    .set({ status: "PAYMENT_SUBMITTED" })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, user.id)));

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);

  return { ok: true as const };
}
