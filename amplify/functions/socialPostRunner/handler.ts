import "server-only";
import { db } from "../../../drizzle/db";
import { socialPosts } from "../../../drizzle/schema";
import { eq, inArray, sql } from "drizzle-orm";

type Provider = "x" | "facebook" | "instagram";

function req(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

async function postToX(text: string) {
  const token = req("X_USER_TOKEN");

  const res = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`X error: ${res.status} ${JSON.stringify(data)}`);
  return { id: data?.data?.id ?? null, raw: data };
}

async function postToFacebookPage(message: string) {
  const version = (process.env.META_GRAPH_VERSION ?? "v21.0").replace(/^v?/, "v");
  const pageId = req("META_PAGE_ID");
  const token = req("META_PAGE_TOKEN");

  const form = new URLSearchParams();
  form.set("message", message);
  form.set("access_token", token);

  const res = await fetch(`https://graph.facebook.com/${version}/${pageId}/feed`, {
    method: "POST",
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`FB error: ${res.status} ${JSON.stringify(data)}`);
  return { id: data?.id ?? null, raw: data };
}

async function postToInstagram(caption: string, mediaUrls: string[]) {
  const version = (process.env.META_GRAPH_VERSION ?? "v21.0").replace(/^v?/, "v");
  const igUserId = req("IG_USER_ID");
  const token = req("IG_TOKEN");

  const mediaUrl = mediaUrls?.[0];
  if (!mediaUrl) throw new Error("Instagram requires at least 1 media URL");

  // 1) Create container
  const createForm = new URLSearchParams();
  createForm.set("image_url", mediaUrl);
  createForm.set("caption", caption);
  createForm.set("access_token", token);

  const createRes = await fetch(`https://graph.facebook.com/${version}/${igUserId}/media`, {
    method: "POST",
    body: createForm,
  });

  const createData = await createRes.json().catch(() => ({}));
  if (!createRes.ok) throw new Error(`IG create error: ${createRes.status} ${JSON.stringify(createData)}`);

  const creationId = createData?.id;
  if (!creationId) throw new Error(`IG create returned no id: ${JSON.stringify(createData)}`);

  // 2) Publish
  const pubForm = new URLSearchParams();
  pubForm.set("creation_id", creationId);
  pubForm.set("access_token", token);

  const pubRes = await fetch(`https://graph.facebook.com/${version}/${igUserId}/media_publish`, {
    method: "POST",
    body: pubForm,
  });

  const pubData = await pubRes.json().catch(() => ({}));
  if (!pubRes.ok) throw new Error(`IG publish error: ${pubRes.status} ${JSON.stringify(pubData)}`);

  return { id: pubData?.id ?? null, raw: { createData, pubData } };
}

// Backoff: 2m, 4m, 8m, 16m, 32m (cap 60m)
function backoffMinutes(attempts: number) {
  const mins = Math.min(60, Math.pow(2, Math.max(1, attempts)));
  return mins;
}

const BATCH = 10;
const MAX_ATTEMPTS = 5;

export const handler = async () => {
  const now = new Date();

  // ✅ 1) Claim due rows safely using SKIP LOCKED
  const claimed = await db.transaction(async (tx) => {
    // Select IDs due now or “post now” (scheduled_at IS NULL)
    const idsRes = await tx.execute<{ id: string }>(sql`
      select id
      from social_posts
      where status = 'queued'
        and (scheduled_at is null or scheduled_at <= now())
      order by created_at asc
      limit ${BATCH}
      for update skip locked
    `);

    const ids = idsRes.rows.map((r) => r.id);
    if (ids.length === 0) return [];

    // Mark them as sending + increment attempts (so even crashes count as an attempt)
    await tx
      .update(socialPosts)
      .set({
        status: "sending",
        attempts: sql`${socialPosts.attempts} + 1`,
        updatedAt: new Date(),
      })
      .where(inArray(socialPosts.id, ids));

    // Fetch full rows to process
    return tx.select().from(socialPosts).where(inArray(socialPosts.id, ids));
  });

  for (const post of claimed) {
    try {
      let result: any = null;
      const provider = post.provider as Provider;

      if (provider === "x") result = await postToX(post.textBody);
      if (provider === "facebook") result = await postToFacebookPage(post.textBody);
      if (provider === "instagram") result = await postToInstagram(post.textBody, post.mediaUrls ?? []);

      await db
        .update(socialPosts)
        .set({
          status: "sent",
          sentAt: new Date(),
          result,
          error: null,
          updatedAt: new Date(),
        })
        .where(eq(socialPosts.id, post.id));
    } catch (err: any) {
      const attempts = Number(post.attempts ?? 1); // already incremented when claimed

      if (attempts >= MAX_ATTEMPTS) {
        await db
          .update(socialPosts)
          .set({
            status: "failed",
            error: String(err?.message ?? err),
            updatedAt: new Date(),
          })
          .where(eq(socialPosts.id, post.id));
        continue;
      }

      const mins = backoffMinutes(attempts);
      const nextTry = new Date(Date.now() + mins * 60_000);

      // ✅ retry later by putting it back to queued and setting scheduledAt
      await db
        .update(socialPosts)
        .set({
          status: "queued",
          scheduledAt: nextTry,
          error: String(err?.message ?? err),
          updatedAt: new Date(),
        })
        .where(eq(socialPosts.id, post.id));
    }
  }
};
