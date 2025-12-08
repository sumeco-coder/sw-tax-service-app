"use client";

import { useState } from "react";
import { SignOutButton } from "./SignOutButton";
import { SignInButton } from "./SignInButton";

type UserMenuProps = {
  // when you wire auth later, change these to real props
  isAuthenticated?: boolean;
  name?: string;
  roleLabel?: string;
};

export function UserMenu({
  isAuthenticated = true,
  name = "Tax Firm Owner",
  roleLabel = "LMS Admin",
}: UserMenuProps) {
  const [open, setOpen] = useState(false);

  if (!isAuthenticated) {
    // design: just show sign-in button
    return <SignInButton />;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs shadow-sm border border-slate-200 hover:border-blue-400 transition"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="text-left">
          <p className="text-xs font-semibold text-slate-900 line-clamp-1">
            {name}
          </p>
          <p className="text-[10px] text-slate-500 line-clamp-1">
            {roleLabel}
          </p>
        </div>
        <span className="text-slate-400 text-xs">▼</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white shadow-lg text-xs overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="font-semibold text-slate-900">{name}</p>
            <p className="text-[11px] text-slate-500">{roleLabel}</p>
          </div>

          <button
            className="w-full px-3 py-2 text-left text-slate-600 hover:bg-slate-50"
            type="button"
          >
            Profile & settings
          </button>

          <div className="border-t border-slate-100 px-3 py-2">
            <SignOutButton />
          </div>
        </div>
      )}
    </div>
  );
}
