// app/api/admin/email/run-campaign/route.ts
import { NextResponse } from "next/server";
import { db } from "@/drizzle/db";
import { emailCampaigns } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

function assertRunnerAuth(req: Request) {
  const secret = process.env.EMAIL_SCHEDULER_SECRET;
  if (!secret) throw new Error("EMAIL_SCHEDULER_SECRET is not set");

  const header = req.headers.get("x-scheduler-secret") ?? "";
  if (header !== secret) throw new Error("Unauthorized");
}

// TODO: replace with your real recipient resolution
async function getRecipientsForCampaign(campaignId: string): Promise<string[]> {
  // Example: return ["a@email.com", "b@email.com"]
  // - segment: waitlist_pending -> query waitlist table
  // - listId -> query your email list members
  // - manualRecipientsRaw -> parse and validate emails
  return [];
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function POST(req: Request) {
  try {
    assertRunnerAuth(req);

    const body = await req.json();
    const campaignId = typeof body?.campaignId === "string" ? body.campaignId : "";
    if (!campaignId) {
      return NextResponse.json({ ok: false, error: "campaignId is required" }, { status: 400 });
    }

    const [campaign] = await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, campaignId))
      .limit(1);

    if (!campaign) throw new Error("Campaign not found");

    // mark sending
    await db
      .update(emailCampaigns)
      .set({ status: "sending", updatedAt: new Date() } as any)
      .where(eq(emailCampaigns.id, campaignId));

    const recipients = await getRecipientsForCampaign(campaignId);
    if (recipients.length === 0) {
      throw new Error("No recipients found for this campaign");
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");

    // send in batches of 100 (Resend batch limit)
    for (const batch of chunk(recipients, 100)) {
      await resend.batch.send(
        batch.map((email) => ({
          from: "SW Tax Service <no-reply@swtaxservice.com>",
          to: [email], // ✅ one recipient per email (no one sees others)
          subject: campaign.subject,
          html: campaign.htmlBody,
          text: campaign.textBody ?? undefined,
        }))
      );
    }

    // mark sent
    await db
      .update(emailCampaigns)
      .set({
        status: "sent",
        sentAt: new Date(),
        scheduledAt: null,
        updatedAt: new Date(),
      } as any)
      .where(eq(emailCampaigns.id, campaignId));

    return NextResponse.json({ ok: true, sent: recipients.length });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
