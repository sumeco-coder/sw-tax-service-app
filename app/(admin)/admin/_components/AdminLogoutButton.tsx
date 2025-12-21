"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "aws-amplify/auth";
import { configureAmplify } from "@/lib/amplifyClient";

export default function AdminLogoutButton({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  // ✅ configure Amplify once, safely
  const configuredRef = useRef(false);
  useEffect(() => {
    if (!configuredRef.current) {
      configureAmplify();
      configuredRef.current = true;
    }
  }, []);

  async function handleLogout() {
    if (pending) return;
    setPending(true);

    try {
      // 1) Amplify/Cognito sign out
      try {
        await signOut({ global: true });
      } catch {
        try {
          await signOut();
        } catch {}
      }

      // 2) Clear server cookies (your endpoint)
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });
      } catch {}

      // 3) Close drawer if needed
      try {
        onDone?.();
      } catch {}

      // 4) Go to admin sign-in
      router.replace("/admin/sign-in");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className={[
        "mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2",
        "text-left text-sm font-semibold text-white/90",
        "hover:bg-white/10 disabled:opacity-60",
        "flex items-center gap-3",
      ].join(" ")}
      aria-label="Sign out"
    >
      <LogOut className="h-4 w-4 text-white/70" />
      <span>{pending ? "Signing out..." : "Sign out"}</span>
    </button>
  );
}
