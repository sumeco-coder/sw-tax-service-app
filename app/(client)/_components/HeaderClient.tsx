// app/(main)/_components/HeaderClient.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { configureAmplify } from "@/lib/amplifyClient";
import { signOut } from "aws-amplify/auth";

configureAmplify();

export default function HeaderClient({ displayName }: { displayName: string }) {
  const pathname = usePathname();

  // Dynamic title based on current route
  const title =
    pathname === "/dashboard"
      ? "Dashboard"
      : pathname === "/profile"
        ? "Profile"
        : pathname === "/settings"
          ? "Settings"
          : "App";

  async function onSignOut() {
    try {
      await signOut();
    } finally {
      window.location.href = "/sign-in";
    }
  }

  return (
    <>
      <h1 className="text-lg font-semibold">{title}</h1>

      <div className="ml-auto flex items-center gap-3">
        <span className="text-sm text-gray-700">
          Welcome, <strong>{displayName}</strong>
        </span>

        <Link
          href="/profile"
          className="text-sm text-gray-700 hover:text-blue-600"
        >
          My Account
        </Link>

        
      </div>
    </>
  );
}
