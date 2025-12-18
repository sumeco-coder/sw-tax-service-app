"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Menu } from "lucide-react";
import AdminNav from "./AdminNav";

const BRAND = {
  primary: "#E00040",
  accent: "#B04020",
};

export default function AdminSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top-left menu button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-30 inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 p-2 text-white backdrop-blur md:hidden"
        aria-label="Open admin menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden w-72 border-r border-white/10 bg-[#0b0b10] px-4 py-6 md:block">
        <BrandHeader />
        <AdminNav />
        <QuickLinks />
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* overlay */}
          <button
            aria-label="Close admin menu overlay"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />

          {/* drawer */}
          <div className="absolute left-0 top-0 h-full w-[82%] max-w-sm border-r border-white/10 bg-[#0b0b10] px-4 py-6">
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

            <div className="mt-6 text-xs text-white/50">
              <div className="h-px bg-white/10" />
              <p className="mt-4">
                SW Tax Service • Admin
              </p>
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
        {/* Replace with your logo image later if you want */}
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10">
          <span className="text-sm font-black text-white">SW</span>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
            Admin Panel
          </p>
          <h2 className="truncate text-base font-semibold text-white">
            SW Tax Service
          </h2>
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
        <Link className="hover:underline" href="/tax-knowledge/wheres-my-refund" onClick={onNavigate}>
          Where’s My Refund →
        </Link>
        <Link className="hover:underline" href="/tax-knowledge/docs-checklist" onClick={onNavigate}>
          Docs Checklist →
        </Link>
      </div>
    </div>
  );
}
