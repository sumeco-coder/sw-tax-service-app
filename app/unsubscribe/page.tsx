// app/unsubscribe/page.tsx
import { db } from "@/drizzle/db";
import {
  emailRecipients,
  emailUnsubscribes,
  emailSubscribers,
} from "@/drizzle/schema"; // remove emailSubscribers import if you don’t have/use it here
import { eq } from "drizzle-orm";

type UnsubscribePageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function Page({ searchParams }: UnsubscribePageProps) {
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

  // 1) Find recipient by token
  const [rec] = await db
    .select({
      email: emailRecipients.email,
    })
    .from(emailRecipients)
    .where(eq(emailRecipients.unsubToken, token))
    .limit(1);

  if (!rec?.email) {
    return (
      <div className="mx-auto max-w-md p-6">
        <h1 className="text-xl font-semibold">Invalid link</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This unsubscribe link is invalid or already processed.
        </p>
      </div>
    );
  }

  const email = rec.email.toLowerCase();

  // 2) Record unsubscribe (idempotent)
  await db
    .insert(emailUnsubscribes)
    .values({ email, source: "page" })
    .onConflictDoUpdate({
      target: emailUnsubscribes.email,
      set: { unsubscribedAt: new Date(), source: "page" },
    });

  // 3) Mark any recipient rows as unsubscribed (token-specific + future)
  await db
    .update(emailRecipients)
    .set({ status: "unsubscribed", updatedAt: new Date() })
    .where(eq(emailRecipients.email, email));

  // 4) OPTIONAL: if you want your master list updated too
  // (remove if you don’t want this)
  try {
    await db
      .update(emailSubscribers)
      .set({ status: "unsubscribed", updatedAt: new Date() })
      .where(eq(emailSubscribers.email, email));
  } catch {
    // ignore if table not present / not used
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">You’re unsubscribed</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {email} will no longer receive emails from SW Tax Service.
      </p>
    </div>
  );
}
