import Link from "next/link";

export const dynamic = "force-dynamic";

export default function LeadReportsPage() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Lead Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quick access to your lead sources. Full reporting dashboard coming soon.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link className="rounded-2xl border bg-background/80 p-5 hover:shadow-md transition" href="/admin/leads/emails">
          <div className="font-semibold">Leads (Emails)</div>
          <div className="text-sm text-muted-foreground">Universal email captures</div>
        </Link>

        <Link className="rounded-2xl border bg-background/80 p-5 hover:shadow-md transition" href="/admin/leads">
          <div className="font-semibold">Tax Calculator Leads</div>
          <div className="text-sm text-muted-foreground">Calculator emails + estimate snapshot</div>
        </Link>
      </div>
    </div>
  );
}
