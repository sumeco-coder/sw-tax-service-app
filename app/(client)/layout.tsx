"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import HeaderClient from "./_components/HeaderClient";
import { configureAmplify } from "@/lib/amplifyClient";
import { getCurrentUser, fetchUserAttributes, signOut } from "aws-amplify/auth";

configureAmplify();

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: "🏠" },
  { name: "Documents", href: "/documents", icon: "📂" },
  { name: "Messages", href: "/messages", icon: "💬" },
  { name: "Invoices", href: "/invoices", icon: "🧾" },
  { name: "Settings", href: "/settings", icon: "⚙️" },
];

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // TODO: this should come from Amplify Auth → getCurrentUser()
  const [displayName, setDisplayName] = useState<string>("Client");
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // 🔐 Load Amplify user on mount
  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const user = await getCurrentUser(); // throws if not signed in
        const attrs = await fetchUserAttributes().catch(() => ({}) as any);

        if (cancelled) return;

        // Try name → given_name → email/login → username
        const nameAttr =
          (attrs as any).name ||
          (attrs as any).given_name ||
          (attrs as any).preferred_username;

        const loginId = user.signInDetails?.loginId;
        const fallback = nameAttr || loginId || user.username || "Client";

        setDisplayName(fallback);
      } catch (err) {
        if (!cancelled) {
          // Not signed in or error – fallback label
          setDisplayName("Guest");
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    try {
      await signOut();
    } catch (err) {
      console.error("Sign-out error:", err);
    } finally {
      router.push("/sign-in");
    }
  }

  return (
    <div
      className="
  min-h-screen
  bg-gradient-to-br 
  from-[#1E2532] 
  via-[#242B38] 
  to-[#1E2532]
  text-slate-50
"
    >
      {/* 🔹 Top Portal Bar – IRS-style */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          {/* Left: Brand */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push("/dashboard")}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 text-lg font-bold">
              SW
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">
                SW Tax Service
              </span>
              <span className="text-[11px] text-slate-400">Client Portal</span>
            </div>
          </div>

          {/* Right: Help / Messages / Sign out (desktop) */}
          <div className="hidden md:flex items-center gap-6 text-xs text-slate-300">
            <Link href="/help" className="hover:text-white hover:underline">
              Help
            </Link>

            <Link href="/messages" className="hover:text-white hover:underline">
              Messages
            </Link>

            {/* Optional tiny signed-in hint – very subtle */}
            {!authLoading && (
              <span className="text-[11px] text-slate-500">
                Signed in as{" "}
                <span className="font-medium text-slate-200">
                  {displayName}
                </span>
              </span>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="rounded border border-slate-600 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden h-9 w-9 flex items-center justify-center rounded-lg border border-slate-700 cursor-pointer"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-950/95">
            <nav className="mx-auto max-w-6xl px-4 py-2 space-y-1 text-sm">
              {/* Top-level actions */}
              <Link
                href="/help"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900"
              >
                Help
              </Link>
              <Link
                href="/messages"
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900"
              >
                Messages
              </Link>

              {/* Divider */}
              <div className="my-2 h-px bg-slate-800" />

              {/* Main nav items */}
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cx(
                      "flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer",
                      isActive
                        ? "bg-slate-800 text-slate-50"
                        : "text-slate-300 hover:bg-slate-900"
                    )}
                  >
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              {/* Sign out */}
              <button
                type="button"
                onClick={async () => {
                  setMobileOpen(false);
                  await handleLogout();
                }}
                className="mt-2 w-full rounded-lg px-3 py-2 text-left text-slate-300 hover:bg-slate-900"
              >
                Sign out
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Page-level header (kept) */}
      <div className="mx-auto max-w-6xl h-14 px-4 flex items-center gap-3">
        <HeaderClient displayName={displayName} />
      </div>

      {/* Main Layout (Sidebar + Content) */}
      <div className="mx-auto flex max-w-6xl px-4 md:px-6 gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-56 flex-shrink-0 border-r border-slate-800/80 py-4">
          <nav className="space-y-1 text-sm">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    "flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer",
                    isActive
                      ? "bg-slate-800 text-slate-50"
                      : "text-slate-300 hover:bg-slate-900 hover:text-slate-50"
                  )}
                >
                  <span>{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Page Content */}
        <main className="flex-1 pb-10">{children}</main>
      </div>
    </div>
  );
}
