import { redirect } from "next/navigation";
import { db } from "@/drizzle/db";
import { clientAgreements } from "@/drizzle/schema";
import { getServerRole } from "@/lib/auth/roleServer";
import { desc, sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

export default async function ComplianceReportPage() {
  const me = await getServerRole();
  if (!me?.sub) redirect("/admin/sign-in");
  const role = String(me?.role ?? "").toLowerCase();
  if (!(role === "admin" || role === "superadmin")) redirect("/not-authorized");

  const since30 = daysAgo(30);

  const [total, last30, byKind, latest] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(clientAgreements)
      .then((r) => r[0]?.count ?? 0),

    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(clientAgreements)
      .where(sql`${clientAgreements.createdAt} >= ${since30}`)
      .then((r) => r[0]?.count ?? 0),

    db
      .select({
        kind: clientAgreements.kind,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(clientAgreements)
      .groupBy(clientAgreements.kind),

    db
      .select({
        id: clientAgreements.id,
        userId: clientAgreements.userId,
        taxYear: clientAgreements.taxYear,
        kind: clientAgreements.kind,
        decision: clientAgreements.decision,
        taxpayerName: clientAgreements.taxpayerName,
        taxpayerSignedAt: clientAgreements.taxpayerSignedAt,
        spouseRequired: clientAgreements.spouseRequired,
        spouseSignedAt: clientAgreements.spouseSignedAt,
        ip: clientAgreements.ip,
        userAgent: clientAgreements.userAgent,
        createdAt: clientAgreements.createdAt,
      })
      .from(clientAgreements)
      .orderBy(desc(clientAgreements.createdAt))
      .limit(20),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Compliance / Audit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Agreement signatures (consents + engagement) with IP/User-Agent trail.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Total agreements" value={String(total)} />
        <Card label="Signed last 30 days" value={String(last30)} />
      </div>

      <div className="rounded-2xl border bg-background/80 shadow-sm">
        <div className="border-b p-4">
          <h2 className="font-semibold">By kind</h2>
        </div>
        <div className="p-4 space-y-2 text-sm">
          {byKind.map((r) => (
            <div key={String(r.kind)} className="flex items-center justify-between">
              <span className="text-muted-foreground">{String(r.kind)}</span>
              <span className="font-medium">{r.count ?? 0}</span>
            </div>
          ))}
          {!byKind.length ? (
            <p className="text-sm text-muted-foreground">No agreements yet.</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border bg-background/80 shadow-sm overflow-x-auto">
        <div className="border-b p-4">
          <h2 className="font-semibold">Latest signatures</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="p-3 text-left">Taxpayer</th>
              <th className="p-3 text-left">Kind</th>
              <th className="p-3 text-left">Decision</th>
              <th className="p-3 text-left">Tax year</th>
              <th className="p-3 text-left">Signed</th>
              <th className="p-3 text-left">IP</th>
              <th className="p-3 text-left">Spouse</th>
            </tr>
          </thead>
          <tbody>
            {latest.map((a) => (
              <tr key={a.id} className="border-b last:border-0">
                <td className="p-3">{a.taxpayerName}</td>
                <td className="p-3">{String(a.kind)}</td>
                <td className="p-3">{String(a.decision)}</td>
                <td className="p-3">{String(a.taxYear)}</td>
                <td className="p-3">
                  {new Date(a.taxpayerSignedAt as any).toLocaleString("en-US")}
                </td>
                <td className="p-3">{a.ip ?? "—"}</td>
                <td className="p-3">
                  {a.spouseRequired ? (a.spouseSignedAt ? "Signed" : "Required") : "No"}
                </td>
              </tr>
            ))}
            {!latest.length ? (
              <tr>
                <td className="p-3 text-muted-foreground" colSpan={7}>
                  No agreements yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
