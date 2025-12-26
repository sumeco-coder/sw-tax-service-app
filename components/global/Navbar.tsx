// components/global/Navbar
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FaBars, FaTimes } from "react-icons/fa";

const links = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/lms", label: "LMS for Tax Pros" },
  { href: "/tax-knowledge", label: "Tax Knowledge" },
  { href: "/waitlist", label: "Waitlist" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            // ✅ Use a path that actually exists:
            // If you don't have /brand/logo.png, use /favicon-32x32.png for now
            src="/swtax-favicon-pack/favicon-32x32.png"
            alt="SW Tax Service"
            width={44}
            height={44}
            className="rounded-full ring-1 ring-border"
            priority
          />

          <div className="leading-tight">
            <div className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              SW Tax <span className="text-primary">Service</span>
            </div>
            <div className="text-sm text-muted-foreground sm:text-[13px]">
              Fast • Secure • Online Filing
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-base font-semibold text-foreground/80 transition-colors hover:text-primary"
            >
              {l.label}
            </Link>
          ))}

          <Link
            href="/sign-in"
            className="rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95"
            style={{ background: "var(--brand-gradient)" }}
          >
            Sign In
          </Link>
        </div>

        {/* Mobile button */}
        <button
          className="md:hidden rounded-2xl border border-border bg-card p-3 text-foreground shadow-sm hover:bg-muted"
          onClick={() => setIsOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {isOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setIsOpen(false)}
                className="rounded-2xl border border-border bg-card px-4 py-3 text-base font-semibold text-foreground/85 hover:bg-muted hover:text-primary"
              >
                {l.label}
              </Link>
            ))}

            <Link
              href="/sign-in"
              onClick={() => setIsOpen(false)}
              className="rounded-2xl px-4 py-3 text-center text-base font-bold text-white shadow-sm hover:opacity-95"
              style={{ background: "var(--brand-gradient)" }}
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
