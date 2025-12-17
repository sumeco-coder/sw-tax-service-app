import "server-only";
import { db } from "../../../drizzle/db";
import { socialPosts } from "../../../drizzle/schema";
import { and, eq, lte, isNotNull } from "drizzle-orm";

type Provider = "x" | "facebook" | "instagram";

function req(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

async function postToX(text: string) {
  // POST /2/tweets requires user-context auth (not app-only). :contentReference[oaicite:1]{index=1}
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
  if (!res.ok)
    throw new Error(`X error: ${res.status} ${JSON.stringify(data)}`);

  return { id: data?.data?.id ?? null, raw: data };
}

async function postToFacebookPage(message: string) {
  // Publishing uses /{page-id}/feed. :contentReference[oaicite:2]{index=2}
  const version = (process.env.META_GRAPH_VERSION ?? "v21.0").replace(
    /^v?/,
    "v"
  );
  const pageId = req("META_PAGE_ID");
  const token = req("META_PAGE_TOKEN");

  const form = new URLSearchParams();
  form.set("message", message);
  form.set("access_token", token);

  const res = await fetch(
    `https://graph.facebook.com/${version}/${pageId}/feed`,
    {
      method: "POST",
      body: form,
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(`FB error: ${res.status} ${JSON.stringify(data)}`);

  return { id: data?.id ?? null, raw: data };
}

async function postToInstagram(caption: string, mediaUrls: string[]) {
  // IG publishing is create container then publish.
  const version = (process.env.META_GRAPH_VERSION ?? "v21.0").replace(
    /^v?/,
    "v"
  );
  const igUserId = req("IG_USER_ID");
  const token = req("IG_TOKEN");

  const mediaUrl = mediaUrls?.[0];
  if (!mediaUrl) throw new Error("Instagram requires at least 1 media URL");

  // 1) Create media container
  const createForm = new URLSearchParams();
  createForm.set("image_url", mediaUrl);
  createForm.set("caption", caption);
  createForm.set("access_token", token);

  const createRes = await fetch(
    `https://graph.facebook.com/${version}/${igUserId}/media`,
    {
      method: "POST",
      body: createForm,
    }
  );
  const createData = await createRes.json().catch(() => ({}));
  if (!createRes.ok)
    throw new Error(
      `IG create error: ${createRes.status} ${JSON.stringify(createData)}`
    );

  const creationId = createData?.id;
  if (!creationId)
    throw new Error(`IG create returned no id: ${JSON.stringify(createData)}`);

  // 2) Publish container
  const pubForm = new URLSearchParams();
  pubForm.set("creation_id", creationId);
  pubForm.set("access_token", token);

  const pubRes = await fetch(
    `https://graph.facebook.com/${version}/${igUserId}/media_publish`,
    {
      method: "POST",
      body: pubForm,
    }
  );
  const pubData = await pubRes.json().catch(() => ({}));
  if (!pubRes.ok)
    throw new Error(
      `IG publish error: ${pubRes.status} ${JSON.stringify(pubData)}`
    );

  return { id: pubData?.id ?? null, raw: { createData, pubData } };
}

export const handler = async () => {
  const now = new Date();

  // Pull a small batch each run to avoid timeouts
  const due = await db
    .select()
    .from(socialPosts)
    .where(
      and(
        eq(socialPosts.status, "queued"),
        isNotNull(socialPosts.scheduledAt),
        lte(socialPosts.scheduledAt, now),
        
      )
    )
    .limit(10);

  for (const post of due) {
    try {
      // mark sending
      await db
        .update(socialPosts)
        .set({ status: "sending", updatedAt: new Date() })
        .where(eq(socialPosts.id, post.id));

      let result: any = null;
      const provider = post.provider as Provider;

      if (provider === "x") result = await postToX(post.textBody);
      if (provider === "facebook")
        result = await postToFacebookPage(post.textBody);
      if (provider === "instagram")
        result = await postToInstagram(post.textBody, post.mediaUrls ?? []);

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
      await db
        .update(socialPosts)
        .set({
          status: "failed",
          error: String(err?.message ?? err),
          updatedAt: new Date(),
        })
        .where(eq(socialPosts.id, post.id));
    }
  }
};
