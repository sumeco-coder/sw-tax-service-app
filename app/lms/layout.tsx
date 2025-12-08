// app/lms/(lms)/layout.tsx
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { LmsAuthGate } from "@/components/Lms/LmsAuthGate";

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/lms/dashboard",
    icon: "📊",
  },
  {
    label: "Courses",
    href: "/lms/courses", // <-- plan for a list page here
    icon: "📚",
  },
  {
    label: "SOP Library",
    href: "/lms/sop",
    icon: "📑",
  },
  {
    label: "Team & Roles",
    href: "/lms/team",
    icon: "👥",
  },
  {
    label: "Reports",
    href: "/lms/reports",
    icon: "📊",
  },
];

export default function LmsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <LmsAuthGate>
      <div className="min-h-screen bg-slate-950 text-slate-50">
        {/* Background gradient */}
        <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-sky-500/20 via-slate-900 to-blue-900" />

        <div className="flex min-h-screen">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:flex w-64 flex-col border-r border-white/10 bg-slate-950/60 backdrop-blur-xl">
            <div className="px-5 py-4 border-b border-white/5">
              <Link href="/" className="block">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
                  SW TAX SERVICE
                </div>
                <div className="mt-1 text-lg font-bold text-white">
                  LMS <span className="text-sky-400">Console</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-300">
                  Train your tax team. Standardize your firm.
                </p>
              </Link>
            </div>

            <nav className="flex-1 px-3 py-5 space-y-1 text-sm">
              {navItems.map((item) => {
                const active =
                  pathname === item.href || pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "flex items-center gap-2 rounded-xl px-3 py-2 transition",
                      active
                        ? "bg-sky-500/15 text-sky-100 border border-sky-500/40 shadow-sm shadow-sky-900/40"
                        : "text-slate-200 hover:bg-white/5 hover:text-white",
                    ].join(" ")}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="px-4 py-4 border-t border-white/5 text-xs text-slate-300">
              <p className="font-medium text-slate-100">Workspace</p>
              <p className="text-[11px] text-slate-400">
                Designed for tax firms who want real systems, not chaos.
              </p>
            </div>
          </aside>

          {/* Main area */}
          <div className="flex-1 flex flex-col">
            {/* Top bar */}
            <header className="border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
              <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-8">
                {/* Left side */}
                <div className="flex items-center gap-2">
                  {/* Mobile menu button */}
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-slate-900/80 p-2 text-slate-100 hover:bg-slate-800 lg:hidden"
                    onClick={() => setMobileOpen((o) => !o)}
                  >
                    <span className="sr-only">Open navigation</span>
                    <div className="space-y-0.5">
                      <span className="block h-0.5 w-4 bg-slate-100" />
                      <span className="block h-0.5 w-3 bg-slate-100" />
                      <span className="block h-0.5 w-4 bg-slate-100" />
                    </div>
                  </button>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">
                      LMS FOR TAX PROS
                    </p>
                    <p className="text-sm text-slate-100">
                      Build courses, SOPs, and onboarding once—reuse every
                      season.
                    </p>
                  </div>
                </div>

                {/* Right side: fake user + Sign out */}
                <div className="flex items-center gap-3">
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-xs font-semibold text-slate-50">
                      Tax Firm Owner
                    </span>
                    <span className="text-[11px] text-slate-400">
                      LMS Admin • SW Tax Service
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white shadow-lg shadow-sky-900/50">
                      SW
                    </div>
                    {/* Small sign-out button */}
                    <SignOutButton />
                  </div>
                </div>
              </div>

              {/* Mobile slide-out nav */}
              {mobileOpen && (
                <div className="border-t border-white/10 bg-slate-950/95 px-3 py-3 lg:hidden">
                  <nav className="space-y-1 text-sm">
                    {navItems.map((item) => {
                      const active =
                        pathname === item.href ||
                        pathname?.startsWith(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={[
                            "flex items-center gap-2 rounded-xl px-3 py-2 transition",
                            active
                              ? "bg-sky-500/20 text-sky-100 border border-sky-500/40"
                              : "text-slate-200 hover:bg-white/5 hover:text-white",
                          ].join(" ")}
                        >
                          <span className="text-lg">{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              )}
            </header>

            {/* Content */}
            <main className="flex-1">
              <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 lg:px-8 lg:py-8">
                <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.85)] lg:p-6">
                  {children}
                </div>

                <div className="py-3 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-200">
                    Tip for later:
                  </span>{" "}
                  Use this LMS to train seasonal preparers, enforce due
                  diligence, and store all your tax firm SOPs in one place.
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </LmsAuthGate>
  );
}
