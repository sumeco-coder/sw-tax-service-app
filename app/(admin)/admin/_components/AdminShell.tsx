// app/(admin)/admin/_components/AdminShell.tsx
import Link from "next/link";
import AdminSidebar from "../_components/AdminSidebar";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b0b10]">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        {/* Desktop sidebar + Mobile drawer */}
        <AdminSidebar />

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0b10]/80 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 pl-14 md:pl-4">

              <p className="hidden text-sm text-white/70 md:block">
                Manage waitlist, email, templates, and social.
              </p>

              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                >
                  View Site
                </Link>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:py-8">
            <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
