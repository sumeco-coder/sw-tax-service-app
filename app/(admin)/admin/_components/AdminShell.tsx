// app/(admin)/admin/_components/AdminShell.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import AdminSidebar from "./AdminSidebar";
import { ChevronDown } from "lucide-react";

const portalLinks = [
  { label: "Client Portal", href: "/dashboard" },
  { label: "Preparer Portal", href: "/preparer" },
  { label: "LMS Portal", href: "/lms" },
];

type AdminShellProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
};

export default function AdminShell({
  children,
  title = "Admin",
  description = "Manage waitlist, email, templates, and social.",
  actions,
}: AdminShellProps) {
  return (
    <div className="min-h-screen bg-[#0b0b10]">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        {/* Sidebar (desktop + mobile drawer) */}
        <AdminSidebar />

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0b10]/80 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 pl-14 md:pl-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">
                  {title}
                </div>
                <p className="hidden truncate text-sm text-white/70 md:block">
                  {description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Optional page-level actions */}
                {actions ? <div className="hidden md:block">{actions}</div> : null}

                {/* Jump to other portals (desktop) */}
                <div className="hidden items-center gap-2 md:flex">
                  {portalLinks.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90 transition hover:bg-white/10"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>

                {/* Jump to other portals (mobile dropdown) */}
                <details className="group md:hidden">
                  <summary className="list-none cursor-pointer rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90 transition hover:bg-white/10">
                    <span className="inline-flex items-center gap-2">
                      Portals <ChevronDown className="h-4 w-4 opacity-80" />
                    </span>
                  </summary>
                  <div className="absolute right-4 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#111118] shadow-xl">
                    {portalLinks.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className="block px-4 py-3 text-sm text-white/90 hover:bg-white/10"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </details>

                {/* View Site */}
                <Link
                  href="/"
                  className="rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10"
                >
                  View Site
                </Link>

                {/* ✅ NO logout in header (logout lives in AdminSidebar only) */}
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
