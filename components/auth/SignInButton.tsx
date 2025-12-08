"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SignInButton() {
  const pathname = usePathname();

  // so after sign in you can send them back to current page if you want
  const href = `/sign-in?next=${encodeURIComponent(pathname || "/lms")}`;

  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition"
    >
      Sign in
    </Link>
  );
}
