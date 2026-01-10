"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function HeaderClient({ displayName }: { displayName: string }) {
  const pathname = usePathname();

  const title =
    pathname === "/dashboard"
      ? "Dashboard"
      : pathname === "/profile"
      ? "Profile"
      : pathname === "/settings"
      ? "Settings"
      : "SW Tax Service";

  return (
    <div className="w-full">
      {/* 3 columns: left / middle / right (prevents overlap on mobile) */}
      <div className="grid w-full grid-cols-[auto,1fr,auto] items-center gap-3">
        {/* LEFT: Logo + Title */}
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
          <Image
            src="/swtax-favicon-pack/apple-touch-icon.png"
            alt="SW Tax Service"
            width={28}
            height={28}
            className="shrink-0 rounded-full"
            priority
          />
          <h1 className="min-w-0 truncate text-base font-semibold text-slate-100 sm:text-lg">
            {title}
          </h1>
        </Link>

        {/* MIDDLE: Welcome (truncates instead of colliding) */}
        <div className="min-w-0 text-center">
          <span className="block truncate text-xs text-slate-300 sm:text-sm">
            <span className="hidden sm:inline">Welcome, </span>
            <strong className="text-slate-100">{displayName}</strong>
          </span>
        </div>

        {/* RIGHT: My Account */}
        <Button
          asChild
          variant="ghost"
          className="h-9 shrink-0 px-3 text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <Link href="/profile">My Account</Link>
        </Button>
      </div>
    </div>
  );
}
