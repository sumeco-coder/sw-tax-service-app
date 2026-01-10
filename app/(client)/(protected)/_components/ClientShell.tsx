// app/(client)(protected)/_components/ClientShell.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import HeaderClient from "./HeaderClient";
import { ActivityHeartbeat } from "./ActivityHeartbeat";
import IdleSignOut from "./IdleSignOut";
import { configureAmplify } from "@/lib/amplifyClient";
import {
  getCurrentUser,
  fetchUserAttributes,
  signOut,
  fetchAuthSession,
} from "aws-amplify/auth";
import {
  LayoutDashboard,
  User2,
  Users2,
  FolderOpen,
  FileText,
  ClipboardList,
  MessageSquare,
  Receipt,
  HelpCircle,
  LogOut,
  Shield,
  ChevronRight,
} from "lucide-react";

configureAmplify();

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** ✅ Brand colors */
const BRAND = {
  pink: "#E62A68",
  copper: "#BB4E2B",
  charcoal: "#2C2B32",
  charcoal2: "#1B1A1F",
  gray: "#9DA0AA",
};

type NavItem = {
  name: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const baseNavItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", Icon: LayoutDashboard },
  { name: "Profile", href: "/profile", Icon: User2 },
  { name: "Dependents", href: "/dependents", Icon: Users2 },
  { name: "Files", href: "/files", Icon: FolderOpen },
  { name: "Documents", href: "/documents", Icon: FileText },
  { name: "Questionnaire", href: "/questionnaire", Icon: ClipboardList },
  { name: "Messages", href: "/messages", Icon: MessageSquare },
  { name: "Invoices", href: "/invoices", Icon: Receipt },
];

function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const { Icon } = item;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cx(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black/30",
        active
          ? "bg-white/7 text-white"
          : "text-white/75 hover:bg-white/5 hover:text-white"
      )}
      style={
        active
          ? ({
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
            } as React.CSSProperties)
          : undefined
      }
    >
      {/* left accent for active */}
      <span
        className={cx(
          "absolute left-0 top-2 bottom-2 w-[3px] rounded-full opacity-0 transition",
          active ? "opacity-100" : "group-hover:opacity-60"
        )}
        style={{
          background: `linear-gradient(180deg, ${BRAND.pink}, ${BRAND.copper})`,
        }}
      />
      <Icon
        className={cx("h-4.5 w-4.5", active ? "opacity-100" : "opacity-85")}
      />
      <span className="flex-1">{item.name}</span>
      <ChevronRight
        className={cx(
          "h-4 w-4 transition",
          active ? "opacity-70" : "opacity-0 group-hover:opacity-50"
        )}
      />
    </Link>
  );
}

export default function ClientShell({
  children,
  isAdmin = false,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string>("Client");
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // ✅ Build nav: prepend Admin Hub only for admin view
  const nav = useMemo<NavItem[]>(() => {
    if (!isAdmin) return baseNavItems;
    return [
      { name: "Admin Hub", href: "/admin", Icon: Shield },
      ...baseNavItems,
    ];
  }, [isAdmin]);

  const activeItems = useMemo(
    () =>
      nav.map((item) => ({
        ...item,
        active: isNavActive(pathname, item.href),
      })),
    [pathname, nav]
  );

  // 🔐 Load Amplify user on mount
  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const user = await getCurrentUser();
        const attrs = await fetchUserAttributes().catch(() => ({}) as any);
        if (cancelled) return;

        const nameAttr =
          (attrs as any).name ||
          (attrs as any).given_name ||
          (attrs as any).preferred_username;

        const loginId = user.signInDetails?.loginId;

        const fallback = nameAttr
          ? `${nameAttr} (${loginId || user.username})`
          : loginId || user.username || "Client";

        setDisplayName(fallback);
      } catch {
        if (!cancelled) router.replace("/sign-in");
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }

    loadUser();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // ✅ Heartbeat
  const heartbeat = React.useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      const token =
        session.tokens?.idToken?.toString() ||
        session.tokens?.accessToken?.toString();

      await fetch("/api/heartbeat", {
        method: "POST",
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch {}
  }, []);

  useEffect(() => {
    if (!authLoading) heartbeat();
  }, [authLoading, pathname, heartbeat]);

  useEffect(() => {
    if (authLoading) return;

    const id = setInterval(heartbeat, 60_000);

    const onVis = () => {
      if (document.visibilityState === "visible") heartbeat();
    };

    window.addEventListener("focus", heartbeat);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(id);
      window.removeEventListener("focus", heartbeat);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [authLoading, heartbeat]);

 async function handleLogout() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      cache: "no-store",
    }).catch(() => {});
    await signOut();
  } catch (err) {
    console.error("Sign-out error:", err);
  } finally {
    router.replace("/sign-in");
    router.refresh();
  }
}


  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: `radial-gradient(1200px 700px at 15% 0%, rgba(230,42,104,0.12), transparent 60%),
                     radial-gradient(900px 600px at 85% 15%, rgba(187,78,43,0.10), transparent 55%),
                     linear-gradient(135deg, ${BRAND.charcoal2}, ${BRAND.charcoal})`,
      }}
    >
      {/* Top Bar */}
      <header
        className="sticky top-0 z-40 border-b backdrop-blur"
        style={{
          background: "rgba(10,10,14,0.72)",
          borderColor: "rgba(255,255,255,0.08)",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          {/* Brand */}
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-3 text-left focus:outline-none"
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-2xl font-extrabold tracking-tight"
              style={{
                background: `linear-gradient(135deg, ${BRAND.pink}, ${BRAND.copper})`,
                color: "white",
              }}
            >
              SW
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">
                SW Tax Service
              </span>
              <span className="text-[11px]" style={{ color: BRAND.gray }}>
                Client Portal{isAdmin ? " (Admin View)" : ""}
              </span>
            </div>
          </button>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-6 text-xs">
            <Link
              href="/help"
              className="inline-flex items-center gap-2 text-white/75 hover:text-white"
            >
              <HelpCircle className="h-4 w-4" />
              Help
            </Link>

            <Link
              href="/messages"
              className="inline-flex items-center gap-2 text-white/75 hover:text-white"
            >
              <MessageSquare className="h-4 w-4" />
              Messages
            </Link>

            {!authLoading && (
              <span className="text-[11px] text-white/45">
                Signed in as{" "}
                <span className="font-medium text-white/85">{displayName}</span>
              </span>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/5"
              style={{ borderColor: "rgba(255,255,255,0.12)" }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border text-white/90"
            style={{ borderColor: "rgba(255,255,255,0.12)" }}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            className="md:hidden border-t"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <div className="mx-auto max-w-6xl px-4 py-3 space-y-3">
              <div
                className="rounded-2xl border p-3"
                style={{
                  borderColor: "rgba(255,255,255,0.10)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div className="text-xs text-white/50">Signed in as</div>
                <div className="mt-1 text-sm font-semibold text-white/90">
                  {authLoading ? "…" : displayName}
                </div>
              </div>

              <div className="h-px bg-white/10" />

              <nav className="space-y-1">
                {activeItems.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    active={item.active}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
              </nav>

              <ActivityHeartbeat />
              <IdleSignOut minutes={20} />

              <button
                type="button"
                onClick={async () => {
                  setMobileOpen(false);
                  await handleLogout();
                }}
                className="mt-1 w-full inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm text-white/90 hover:bg-white/5"
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Page-level header */}
      <div className="mx-auto max-w-6xl px-4 md:px-6 pt-4">
        <div
          className="rounded-2xl border px-3 py-3 md:px-4"
          style={{
            borderColor: "rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <HeaderClient displayName={displayName} />
        </div>
      </div>

      {/* Layout */}
      <div className="mx-auto flex max-w-6xl gap-6 px-4 md:px-6 pb-10 pt-6">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-64 flex-shrink-0">
          <div
            className="sticky top-[76px] rounded-2xl border p-4"
            style={{
              borderColor: "rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div className="mb-4">
              <div className="text-xs text-white/45">Signed in as</div>
              <div className="mt-1 text-sm font-semibold text-white/90">
                {authLoading ? "…" : displayName}
              </div>
            </div>

            <nav className="space-y-1">
              {activeItems.map((item) => (
                <NavLink key={item.href} item={item} active={item.active} />
              ))}
            </nav>

            <div className="mt-4 pt-4 border-t border-white/10">
              <Link
                href="/help"
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/75 hover:bg-white/5 hover:text-white"
              >
                <HelpCircle className="h-4 w-4" />
                Help Center
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm text-white/90 hover:bg-white/5"
                style={{ borderColor: "rgba(255,255,255,0.12)" }}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          <div
            className="rounded-2xl border p-4 md:p-6"
            style={{
              borderColor: "rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
