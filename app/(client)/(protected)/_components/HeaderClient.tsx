// app/(main)/_components/HeaderClient.tsx
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { configureAmplify } from "@/lib/amplifyClient";

configureAmplify();

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
    <div className="flex w-full items-center gap-3">
      {/* Left: Logo + Title */}
      <Link href="/dashboard" className="flex items-center gap-3">
        <Image
          src="/swtax-favicon-pack/apple-touch-icon.png"
          alt="SW Tax Service"
          width={28}
          height={28}
          className="rounded-full"
          priority
        />
        <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
      </Link>

      {/* Right: Welcome + Account */}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm text-slate-300">
          Welcome, <strong className="text-slate-100">{displayName}</strong>
        </span>

        <Link
          href="/profile"
          className="text-sm text-slate-300 hover:text-white hover:underline"
        >
          My Account
        </Link>
      </div>
    </div>
  );
}
