// app/unsubscribe/page.tsx
import Link from "next/link";
import { db } from "@/drizzle/db";
import {
  emailRecipients,
  emailUnsubscribes,
  emailSubscribers,
} from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { verifyUnsubToken } from "@/lib/email/unsubscribe";

type Props = {
  searchParams: Promise<{
    token?: string;
    error?: "missing_token" | "invalid_link";
  }>;
};

function PageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-10">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}

function BrandHeader() {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-extrabold text-white">
          SW
        </span>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-slate-900">SW Tax Service</div>
          <div className="text-xs text-slate-500">Unsubscribe</div>
        </div>
      </div>

      <span className="inline-flex items-center rounded-full border bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
        Preferences
      </span>
    </div>
  );
}

function Card({
  tone,
  title,
  description,
  email,
}: {
  tone: "success" | "danger" | "neutral";
  title: string;
  description: string;
  email?: string;
}) {
  const toneMap = {
    success: {
      ring: "ring-emerald-100",
      badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      dot: "bg-emerald-500",
      title: "text-emerald-950",
    },
    danger: {
      ring: "ring-rose-100",
      badge: "bg-rose-50 text-rose-700 ring-rose-200",
      dot: "bg-rose-500",
      title: "text-rose-950",
    },
    neutral: {
      ring: "ring-slate-100",
      badge: "bg-slate-50 text-slate-700 ring-slate-200",
      dot: "bg-slate-400",
      title: "text-slate-950",
    },
  }[tone];

  return (
    <div className={`rounded-2xl border bg-white p-6 shadow-sm ring-1 ${toneMap.ring}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className={`mt-1 h-2.5 w-2.5 rounded-full ${toneMap.dot}`} />
          <h1 className={`text-xl font-semibold ${toneMap.title}`}>{title}</h1>
        </div>

        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${toneMap.badge}`}
        >
          {tone === "success" ? "Updated" : tone === "danger" ? "Action needed" : "Info"}
        </span>
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

      {email ? (
        <div className="mt-4 rounded-xl border bg-slate-50 px-4 py-3">
          <div className="text-xs font-medium text-slate-500">Email</div>
          <div className="mt-1 break-all text-sm font-semibold text-slate-900">
            {email}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-2">
        <Link
          href="/"
          className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95"
        >
          Back to website
        </Link>

        <a
          href="mailto:support@swtaxservice.com"
          className="inline-flex w-full items-center justify-center rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          Contact support
        </a>
      </div>

      <div className="mt-6 border-t pt-4 text-xs leading-5 text-slate-500">
        <div>
          <span className="font-semibold text-slate-700">Team:</span> SW Tax Service, LLC
        </div>
        <div>
          <span className="font-semibold text-slate-700">Support:</span>{" "}
          <a className="underline" href="mailto:support@swtaxservice.com">
            support@swtaxservice.com
          </a>
        </div>
        <div>
          <span className="font-semibold text-slate-700">Website:</span>{" "}
          <a className="underline" href="https://www.swtaxservice.com" target="_blank" rel="noreferrer">
            www.swtaxservice.com
          </a>
        </div>
      </div>
    </div>
  );
}

export default async function Page({ searchParams }: Props) {
  const { token, error } = await searchParams;

  // Handle errors coming from the server action
  if (error === "missing_token") {
    return (
      <PageShell>
        <BrandHeader />
        <Card
          tone="danger"
          title="Missing token"
          description="This unsubscribe link is missing a token. Please use the unsubscribe link from the email you received."
        />
      </PageShell>
    );
  }

  if (error === "invalid_link") {
    return (
      <PageShell>
        <BrandHeader />
        <Card
          tone="danger"
          title="Invalid or expired link"
          description="This unsubscribe link is invalid or has expired. Please use the latest email you received to unsubscribe."
        />
      </PageShell>
    );
  }

  // If someone lands here without going through the action, try token flow
  if (!token) {
    return (
      <PageShell>
        <BrandHeader />
        <Card
          tone="neutral"
          title="Unsubscribe"
          description="To unsubscribe, please use the unsubscribe link included in the email you received."
        />
      </PageShell>
    );
  }

  const payload = verifyUnsubToken(token);
  if (!payload?.email) {
    return (
      <PageShell>
        <BrandHeader />
        <Card
          tone="danger"
          title="Invalid or expired link"
          description="This unsubscribe link is invalid or has expired. Please use the latest email you received to unsubscribe."
        />
      </PageShell>
    );
  }

  const email = payload.email.toLowerCase().trim();

  // Idempotent unsubscribe write (safe if already unsubscribed)
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
  } catch {
    // ignore
  }

  return (
    <PageShell>
      <BrandHeader />
      <Card
        tone="success"
        title="You’re unsubscribed"
        description="You will no longer receive emails from SW Tax Service."
        email={email}
      />
    </PageShell>
  );
}
