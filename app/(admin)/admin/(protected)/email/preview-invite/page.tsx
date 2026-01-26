// app/(admin)/admin/(protected)/email/preview-invite/page.tsx
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getServerRole } from "@/lib/auth/roleServer";
import { buildPortalInviteEmail } from "@/lib/email/sendPortalInvite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function requireAdmin(auth: any) {
  const role = String(auth?.role ?? "").toUpperCase();
  return (
    role === "ADMIN" ||
    role === "SUPERADMIN" ||
    role === "LMS_ADMIN" ||
    role === "LMS_PREPARER"
  );
}

function normalizeBaseUrl(raw: unknown) {
  let s = String(raw ?? "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  s = s.replace(/\/+$/, "");
  return s;
}

async function getOriginServer() {
  try {
    const h = await headers();
    const host = (h.get("x-forwarded-host") || h.get("host") || "").trim();
    if (host) {
      const protoRaw = (h.get("x-forwarded-proto") || "").trim();
      const proto = protoRaw || (host.includes("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {}

  return (
    normalizeBaseUrl(process.env.APP_URL) ||
    normalizeBaseUrl(process.env.APP_ORIGIN) ||
    normalizeBaseUrl(process.env.SITE_URL) ||
    "http://localhost:3000"
  );
}

function getStr(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function PreviewInviteEmailPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const me = await getServerRole();
  if (!me?.sub) redirect("/admin/sign-in");
  if (!requireAdmin(me)) redirect("/not-authorized");

  const to = getStr(searchParams?.to) || "client@example.com";
  const firstName = getStr(searchParams?.firstName) || "Client";
  const next = getStr(searchParams?.next) || "/onboarding/profile";

  const appUrl = await getOriginServer();

  // ⚠️ Preview uses a fake token. This is for layout preview only.
  const { subject, html, inviteUrl } = buildPortalInviteEmail({
    to,
    firstName,
    appUrl,
    inviteToken: "PREVIEW_TOKEN_DO_NOT_USE",
    next,
  });

  return (
    <main className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Invite Email Preview</h1>
        <p className="text-sm text-muted-foreground">
          This preview does not send an email.
        </p>
      </div>

      <div className="rounded-2xl border bg-background/80 px-4 py-3 text-sm">
        <div><span className="font-semibold">To:</span> {to}</div>
        <div><span className="font-semibold">Subject:</span> {subject}</div>
        <div className="mt-1 break-all text-xs text-muted-foreground">
          <span className="font-semibold">Preview link:</span> {inviteUrl}
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden bg-white">
        <iframe
          title="Email Preview"
          srcDoc={html}
          className="w-full h-[780px]"
        />
      </div>
    </main>
  );
}
