// app/(admin)/admin/(protected)/clients/[userId]/documents/request/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import WatermarkTool from "./_components/WatermarkTool";
import { getServerRole } from "@/lib/auth/roleServer";
import { getClientBasics, redirectToRequestPreview } from "./actions";
import { buildUploadLink, buildRequestDraft } from "./_lib";



export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAdminRole(role: unknown) {
  const r = String(role ?? "").toUpperCase();
  return ["ADMIN", "SUPERADMIN", "LMS_ADMIN", "LMS_PREPARER"].includes(r);
}

const COMMON_ITEMS = [
  "W-2 (wage statement)",
  "1099-NEC / 1099-MISC",
  "1099-G (unemployment)",
  "1099-INT / 1099-DIV",
  "SSA-1099 (Social Security)",
  "Photo ID (front/back)",
  "Last-year tax return (prior-year 1040)",
  "Proof of dependents (school/medical/childcare, if applicable)",
] as const;

function parseItems(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default async function AdminClientDocRequestPage({
  params,
  searchParams,
}: {
  params: { userId: string };
  searchParams?: { items?: string; due?: string; note?: string };
}) {
  const auth = await getServerRole();
  if (!auth) return redirect("/admin/sign-in");
  if (!isAdminRole(auth.role)) return redirect("/admin");

  const client = await getClientBasics(params.userId);

  const items = parseItems(searchParams?.items);
  const due = String(searchParams?.due ?? "").trim();
  const note = String(searchParams?.note ?? "").trim();

  const uploadLink = buildUploadLink();
  const displayName = (client.name ?? client.email ?? "there").split(" ")[0] ?? "there";

  const draft = buildRequestDraft({
    clientName: displayName,
    uploadLink,
    due: due || undefined,
    note: note || undefined,
    items,
  });

  const mailto = (() => {
    const to = client.email ?? "";
    const subject = encodeURIComponent(draft.subject);
    const body = encodeURIComponent(draft.text);
    return `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`;
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client documents</p>
          <h1 className="text-2xl font-black tracking-tight">Request documents</h1>
          <p className="text-sm text-muted-foreground">
            Build a request email for <span className="font-semibold">{client.email}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/clients/${params.userId}/documents`}
            className="rounded-xl border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            Back to docs
          </Link>
          <a
            href={mailto}
            className="rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
          >
            Open mail draft
          </a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* Builder */}
        <div className="space-y-4">
          <section className="rounded-2xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Request builder</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose what you need. Submit to refresh the preview.
            </p>

            <form
              action={async (fd) => {
                "use server";
                await redirectToRequestPreview(params.userId, fd);
              }}
              className="mt-4 space-y-4"
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Due date (optional)</label>
                  <input
                    type="date"
                    name="due"
                    defaultValue={due}
                    className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-foreground/10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Quick pick</label>
                  <Link
                    href={`/admin/clients/${params.userId}/documents/request?items=${encodeURIComponent(
                      ["W-2 (wage statement)", "1099-NEC / 1099-MISC", "Photo ID (front/back)", "Last-year tax return (prior-year 1040)"].join(",")
                    )}`}
                    className="h-10 inline-flex items-center justify-center rounded-xl border bg-background px-3 text-sm font-semibold hover:bg-muted"
                  >
                    W2 + 1099 + ID + prior return
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-3">
                <div className="text-xs font-semibold text-muted-foreground mb-2">Items</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {COMMON_ITEMS.map((label) => (
                    <label key={label} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="items"
                        value={label}
                        defaultChecked={items.includes(label)}
                        className="h-4 w-4"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Note (optional)</label>
                <textarea
                  name="note"
                  defaultValue={note}
                  rows={3}
                  placeholder="Example: If you don’t have a W-2 yet, upload your last paystub."
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foreground/10"
                />
              </div>

              <button className="h-10 rounded-xl bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90">
                Update preview
              </button>
            </form>
          </section>

          {/* Preview */}
          <section className="rounded-2xl border bg-card p-4 space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject</div>
              <div className="mt-1 rounded-xl border bg-muted/30 p-3 text-sm font-semibold">{draft.subject}</div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">HTML preview</div>
              <div className="mt-1 rounded-xl border bg-background p-4">
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: draft.html }} />
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Text version</div>
              <textarea
                readOnly
                className="mt-1 min-h-[220px] w-full rounded-xl border bg-muted/30 p-3 text-xs"
                value={draft.text}
              />
              <div className="mt-2 text-[11px] text-muted-foreground">
                Upload link:{" "}
                <a className="font-semibold underline" href={uploadLink} target="_blank" rel="noreferrer">
                  {uploadLink}
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* Tools */}
        <div className="space-y-4">
          <WatermarkTool userId={params.userId} />

          <div className="rounded-2xl border bg-muted/30 p-4 text-xs text-muted-foreground">
            <div className="font-semibold text-foreground mb-1">Tip</div>
            If you want these requests to show up in the client portal as a checklist, we can later add a small DB table
            (request items + status) and render it on the client documents page.
          </div>
        </div>
      </div>
    </div>
  );
}
