// app/unsubscribe/page.tsx
import { db } from "@/drizzle/db";
import { emailRecipients, emailUnsubscribes, emailSubscribers } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { verifyUnsubToken } from "@/lib/email/unsubscribe";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function Page({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="mx-auto max-w-md p-6">
        <h1 className="text-xl font-semibold">Missing token</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This unsubscribe link is missing a token.
        </p>
      </div>
    );
  }

  const payload = verifyUnsubToken(token);
  if (!payload?.email) {
    return (
      <div className="mx-auto max-w-md p-6">
        <h1 className="text-xl font-semibold">Invalid link</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This unsubscribe link is invalid or expired.
        </p>
      </div>
    );
  }

  const email = payload.email.toLowerCase().trim();

  await db
    .insert(emailUnsubscribes)
    .values({ email, source: "page" })
    .onConflictDoUpdate({
      target: emailUnsubscribes.email,
      set: { unsubscribedAt: new Date(), source: "page" },
    });

  await db
    .update(emailRecipients)
    .set({ status: "unsubscribed", updatedAt: new Date() })
    .where(eq(emailRecipients.email, email));

  try {
    await db
      .update(emailSubscribers)
      .set({ status: "unsubscribed", updatedAt: new Date() })
      .where(eq(emailSubscribers.email, email));
  } catch {}

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">You’re unsubscribed</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {email} will no longer receive emails from SW Tax Service.
      </p>
    </div>
  );
}
