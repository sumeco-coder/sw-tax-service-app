import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ExportsPage() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Exports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Download CSV exports. Add more as you build them.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link className="rounded-2xl border bg-background/80 p-5 hover:shadow-md transition" href="/api/admin/leads/email-leads.csv">
          <div className="font-semibold">Email Leads CSV</div>
          <div className="text-sm text-muted-foreground">Download universal email list</div>
        </Link>
      </div>
    </div>
  );
}
