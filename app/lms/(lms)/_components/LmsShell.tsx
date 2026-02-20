// app/lms/(lms)/_components/LmsShell.tsx
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { SignOutButton } from "@/components/auth/SignOutButton";
import { LmsAuthGate } from "@/components/Lms/LmsAuthGate";
import { ThemeSelect } from "@/components/themes/ThemeSelect";

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

// ✅ Admin menu (your builder/management area)
const adminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/lms/admin/dashboard", icon: "📊" },
  { label: "Courses", href: "/lms/admin/courses", icon: "📚" },
  { label: "SOP Library", href: "/lms/admin/sop", icon: "📑" },
  { label: "Team & Roles", href: "/lms/admin/team", icon: "👥" },
  { label: "Reports", href: "/lms/admin/reports", icon: "📈" },
];

// ✅ Learner menu (students)
const learnerNavItems: NavItem[] = [
  { label: "My Dashboard", href: "/lms/learn/dashboard", icon: "🏠" },
  { label: "My Courses", href: "/lms/learn/courses", icon: "📚" },
  { label: "SOPs", href: "/lms/learn/sop", icon: "📑" },
  { label: "Quizzes", href: "/lms/learn/quizzes", icon: "✅" },
];

export default function LmsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // ✅ Decide which nav to show (based on URL area)
  const isAdminArea = pathname?.startsWith("/lms/admin");
  const items = useMemo(
    () => (isAdminArea ? adminNavItems : learnerNavItems),
    [isAdminArea],
  );

  return (
    <LmsAuthGate>
      <div className="min-h-screen bg-background text-foreground">
        {/* Brand glow overlay */}
        <div
          className="pointer-events-none fixed inset-0 -z-10 opacity-20"
          style={{ background: "var(--brand-gradient)" }}
        />

        <div className="flex min-h-screen">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:flex w-64 h-dvh sticky top-0 flex-col border-r border-sidebar-border bg-sidebar/85 backdrop-blur-xl text-sidebar-foreground">
            <div className="px-5 py-4 border-b border-sidebar-border/60">
              <Link href="/" className="block">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  SW TAX SERVICE
                </div>
                <div className="mt-1 text-lg font-bold">
                  LMS <span className="text-primary">Console</span>
                </div>
                <p className="mt-1 text-[11px] text-sidebar-foreground/75">
                  Train your tax team. Standardize your firm.
                </p>
              </Link>
            </div>

            <nav className="flex-1 px-3 py-5 space-y-1 text-sm">
              {items.map((item) => {
                const active =
                  pathname === item.href || pathname?.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "flex items-center gap-2 rounded-xl px-3 py-2 transition border",
                      active
                        ? "bg-primary/15 text-sidebar-foreground border-primary/40"
                        : "border-transparent text-sidebar-foreground/80 hover:bg-white/5 hover:text-sidebar-foreground",
                    ].join(" ")}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="px-4 py-4 border-t border-sidebar-border/60 text-xs text-sidebar-foreground/80">
              <p className="font-medium text-sidebar-foreground">
                {isAdminArea ? "Admin Workspace" : "Learner Workspace"}
              </p>
              <p className="text-[11px] text-sidebar-foreground/65">
                {isAdminArea
                  ? "Build once. Train every season."
                  : "Complete your assigned training and SOPs."}
              </p>
            </div>
          </aside>

          {/* Main area */}
          <div className="flex-1 flex flex-col">
            {/* Top bar */}
            <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-xl">
              <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-8">
                {/* Left side */}
                <div className="flex items-center gap-2">
                  {/* Mobile menu button */}
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-border bg-card/60 p-2 text-foreground hover:bg-muted/40 lg:hidden"
                    onClick={() => setMobileOpen((o) => !o)}
                    aria-label="Toggle navigation"
                    aria-expanded={mobileOpen}
                  >
                    <div className="space-y-0.5">
                      <span className="block h-0.5 w-4 bg-foreground/90" />
                      <span className="block h-0.5 w-3 bg-foreground/70" />
                      <span className="block h-0.5 w-4 bg-foreground/90" />
                    </div>
                  </button>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                      LMS FOR TAX PROS
                    </p>
                    <p className="text-sm text-foreground">
                      {isAdminArea
                        ? "Build courses, SOPs, and onboarding once—reuse every season."
                        : "Your assigned training, SOPs, and quizzes."}
                    </p>
                  </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-3">
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-xs font-semibold text-foreground">
                      {isAdminArea ? "Tax Firm Owner" : "Learner"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {isAdminArea
                        ? "LMS Admin • SW Tax Service"
                        : "LMS • SW Tax Service"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <ThemeSelect />

                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-primary-foreground shadow-lg"
                      style={{ background: "var(--brand-gradient)" }}
                      title="SW Tax Service"
                    >
                      SW
                    </div>

                    <SignOutButton />
                  </div>
                </div>
              </div>

              {/* Mobile slide-out nav */}
              {mobileOpen && (
                <div className="border-t border-border bg-background/95 px-3 py-3 lg:hidden">
                  <nav className="space-y-1 text-sm">
                    {items.map((item) => {
                      const active =
                        pathname === item.href ||
                        pathname?.startsWith(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={[
                            "flex items-center gap-2 rounded-xl px-3 py-2 transition border",
                            active
                              ? "bg-primary/15 text-foreground border-primary/40"
                              : "border-transparent text-foreground/80 hover:bg-muted/40 hover:text-foreground",
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
                <div className="rounded-3xl border border-border bg-card/70 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.20)] lg:p-6">
                  {children}
                </div>

                <div className="py-3 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Tip for later:
                  </span>{" "}
                  Use this LMS to train seasonal preparers, enforce due diligence,
                  and store all your tax firm SOPs in one place.
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </LmsAuthGate>
  );
}