"use client";

import { useRouter } from "next/navigation";
import React from "react";

export default function QuickActionsCard({
  year,
  fileInputRef,
  handleUpload,
}: {
  year: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm md:col-span-3">
      <h3 className="text-sm font-semibold text-foreground mb-3">
        Quick links & actions
      </h3>

      {/* Primary buttons */}
      <div className="flex flex-wrap gap-2 text-sm mb-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 rounded-lg border border-border bg-background text-foreground cursor-pointer hover:bg-muted transition"
        >
          Upload Document
        </button>

        <button
          onClick={() => router.push(`/onboarding/summary?year=${year}`)}
          className="px-3 py-2 rounded-lg cursor-pointer 
                     bg-[linear-gradient(90deg,#f00067,#4a0055)] text-white 
                     shadow-sm shadow-pink-500/30 hover:brightness-110 transition"
        >
          Start/Continue Return
        </button>
      </div>

      {/* “Launchpad” pill links */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <button
          onClick={() => router.push("/profile")}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 cursor-pointer bg-background hover:bg-muted transition"
        >
          <span>👤</span>
          <span>My Profile</span>
        </button>

        <button
          onClick={() => router.push("/dependents")}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 cursor-pointer bg-background hover:bg-muted transition"
        >
          <span>👨‍👩‍👧‍👦</span>
          <span>Dependents</span>
        </button>

        <button
          onClick={() => router.push("/onboarding/summary")}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 cursor-pointer bg-background hover:bg-muted transition"
        >
          <span>📝</span>
          <span>Questionnaires</span>
        </button>

        <button
          onClick={() => router.push("/billing")}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 cursor-pointer bg-background hover:bg-muted transition"
        >
          <span>💳</span>
          <span>Billing & Payments</span>
        </button>

        <button
          onClick={() => router.push("/returns?tab=past")}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 cursor-pointer bg-background hover:bg-muted transition"
        >
          <span>📁</span>
          <span>Past Returns</span>
        </button>
      </div>

      {/* Hidden input */}
      <input
        id="doc-file"
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
