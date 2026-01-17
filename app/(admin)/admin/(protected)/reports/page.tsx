import Link from "next/link";

export const dynamic = "force-dynamic";

const REPORTS = [
  {
    title: "Revenue & Payments",
    desc: "Stripe payouts, invoices, refunds, chargebacks.",
    href: "/admin/reports/payments",
  },
  {
    title: "Return Production",
    desc: "Returns started / in-progress / filed / rejected.",
    href: "/admin/reports/returns",
  },
  {
    title: "Client Activity",
    desc: "New clients, onboarding completion, portal logins, docs uploaded.",
    href: "/admin/reports/clients",
  },
  {
    title: "Lead Reports",
    desc: "Leads by source, opt-in rate, conversions.",
    href: "/admin/reports/leads",
  },
  {
    title: "Staff / Preparer Performance",
    desc: "Completed returns, turnaround time, response time.",
    href: "/admin/reports/staff",
  },
  {
    title: "Compliance / Audit",
    desc: "Consent logs, engagement signatures, access logs.",
    href: "/admin/reports/compliance",
  },
  {
    title: "Exports",
    desc: "CSV exports: emails, leads, clients, payments.",
    href: "/admin/reports/exports",
  },
];

export default function ReportsPage() {
  return (
    <div className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Operational reporting, accountability, exports, and compliance.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="rounded-2xl border bg-background/80 p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="text-base font-semibold">{r.title}</div>
            <div className="mt-1 text-sm text-muted-foreground">{r.desc}</div>
            <div className="mt-4 text-sm font-medium underline underline-offset-4">
              Open
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
