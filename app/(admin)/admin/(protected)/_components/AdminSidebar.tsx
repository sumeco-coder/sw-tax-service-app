// app/(admin)/admin/_components/AdminSidebar.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Menu, LogOut } from "lucide-react";
import AdminNav from "./AdminNav";
import { configureAmplify } from "@/lib/amplifyClient";
import { signOut } from "aws-amplify/auth";

const BRAND = {
  primary: "#E00040",
  accent: "#B04020",
};

async function hardSignOut() {
  // 1) Clear Amplify/Cognito session
  try {
    await signOut({ global: true });
  } catch {
    try {
      await signOut();
    } catch {}
  }

  // 2) Clear your server cookies
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  } catch {}

  // 3) small delay to avoid race conditions
  await new Promise((r) => setTimeout(r, 200));
}

export default function AdminSidebar() {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  // ✅ configure Amplify once (client-safe)
  const configuredRef = useRef(false);
  useEffect(() => {
    if (!configuredRef.current) {
      configureAmplify();
      configuredRef.current = true;
    }
  }, []);

  // ✅ lock body scroll while drawer open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ✅ ESC closes drawer
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await hardSignOut();
      setOpen(false);
      router.replace("/admin/sign-in");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      {/* Mobile top-left menu button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-30 inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 p-2 text-white backdrop-blur md:hidden"
        aria-label="Open admin menu"
        aria-expanded={open}
        aria-controls="admin-mobile-drawer"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden w-72 border-r border-white/10 bg-[#0b0b10] px-4 py-6 md:flex md:flex-col">
        <BrandHeader />
        <AdminNav />
        <QuickLinks />

        <div className="mt-6">
          <div className="h-px bg-white/10" />
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-4 flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
          >
            <LogOut className="h-4 w-4 text-white/70" />
            {loggingOut ? "Logging out…" : "Logout"}
          </button>

          <p className="mt-4 text-xs text-white/50">SW Tax Service • Admin</p>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          {/* overlay */}
          <button
            type="button"
            aria-label="Close admin menu overlay"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />

          {/* drawer */}
         <div
  id="admin-mobile-drawer"
  className="absolute left-0 top-0 flex h-full w-[82%] max-w-sm flex-col overflow-y-auto overscroll-contain border-r border-white/10 bg-[#0b0b10] px-4 py-6"

>

            <div className="flex items-center justify-between">
              <BrandHeader />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-white/15 bg-white/5 p-2 text-white"
                aria-label="Close admin menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4">
              <AdminNav onNavigate={() => setOpen(false)} />
            </div>

            <div className="mt-6">
              <QuickLinks onNavigate={() => setOpen(false)} />
            </div>

            <div className="mt-auto pt-6">
              <div className="h-px bg-white/10" />

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="mt-4 flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
              >
                <LogOut className="h-4 w-4 text-white/70" />
                {loggingOut ? "Logging out…" : "Logout"}
              </button>

              <p className="mt-4 text-xs text-white/50">SW Tax Service • Admin</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tiny brand glow */}
      <style jsx global>{`
        .sw-brand-glow {
          background: radial-gradient(
              900px 260px at 30% 0%,
              ${BRAND.primary}33 0%,
              transparent 60%
            ),
            radial-gradient(
              700px 240px at 90% 15%,
              ${BRAND.accent}33 0%,
              transparent 55%
            );
        }
      `}</style>
    </>
  );
}

function BrandHeader() {
  return (
    <div className="sw-brand-glow mb-6 rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10">
          <span className="text-sm font-black text-white">SW</span>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
            Admin Panel
          </p>
          <h2 className="truncate text-base font-semibold text-white">SW Tax Service</h2>
        </div>
      </div>
    </div>
  );
}

function QuickLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
      <p className="font-semibold text-white">Quick Links</p>
      <div className="mt-3 flex flex-col gap-2">
        <Link
          className="hover:underline"
          href="/tax-knowledge/wheres-my-refund"
          onClick={onNavigate}
        >
          Where’s My Refund →
        </Link>
        <Link
          className="hover:underline"
          href="/tax-knowledge/docs-checklist"
          onClick={onNavigate}
        >
          Docs Checklist →
        </Link>
      </div>
    </div>
  );
}
