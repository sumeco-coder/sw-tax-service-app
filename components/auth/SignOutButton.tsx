"use client";

import { signOut } from "aws-amplify/auth";
import { useRouter } from "next/navigation";
import { configureAmplify } from "@/lib/amplifyClient";

configureAmplify();

export function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      router.push("/sign-in");
    } catch (err) {
      console.error("Sign out error", err);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-red-300 hover:bg-red-500/10 border border-white/10 transition"
    >
      ⏏ Sign out
    </button>
  );
}
