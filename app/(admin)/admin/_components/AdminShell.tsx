// app/(admin)/waitlist/admin/_components/AdminShell.tsx
import Link from "next/link";

const nav = [
  { label: "Dashboard", href: "/admin" },
  { label: "Waitlist", href: "/admin/waitlist" },
  { label: "Tax Knowledge", href: "/admin/tax-knowledge" },
  { label: "Settings", href: "/admin/settings" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="hidden w-72 border-r bg-white px-4 py-6 md:block">
          <div className="mb-6">
            <p className="text-xs text-gray-500">Admin</p>
            <h1 className="text-lg font-semibold text-gray-900">SW Tax Service</h1>
          </div>

          <nav className="flex flex-col gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-6 rounded-2xl border bg-gray-50 p-4 text-sm">
            <p className="font-semibold text-gray-900">Quick Links</p>
            <div className="mt-2 flex flex-col gap-2">
              <Link className="text-gray-700 hover:underline" href="/tax-knowledge/wheres-my-refund">
                Where’s My Refund →
              </Link>
              <Link className="text-gray-700 hover:underline" href="/tax-knowledge/docs-checklist">
                Docs Checklist →
              </Link>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
              <p className="text-sm text-gray-600">
                Manage waitlist, invites, docs, and tax knowledge.
              </p>

              <div className="flex items-center gap-2">
                <Link href="/" className="rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50">
                  View Site
                </Link>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
