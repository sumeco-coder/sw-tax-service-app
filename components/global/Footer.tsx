"use client";

import Link from "next/link";
import Image from "next/image";
import { FaFacebook, FaTwitter, FaLinkedin, FaInstagram } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      {/* subtle brand line (clean, not spray paint) */}
      <div
        className="h-1 w-full"
        style={{ background: "var(--brand-gradient)" }}
      />

      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/swtax-favicon-pack/favicon-32x32.png" // change if you move it
                alt="SW Tax Service"
                width={40}
                height={40}
                className="rounded-full ring-1 ring-border"
              />
              <div className="leading-tight">
                <h3 className="text-xl font-extrabold tracking-tight text-foreground">
                  SW Tax <span className="text-primary">Service</span>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Fast • Secure • Online Filing
                </p>
              </div>
            </div>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-foreground/75">
              Your trusted partner for secure, accurate, and stress-free tax filing —
              for individuals, businesses, and professionals.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Quick Links</h4>
            <ul className="mt-3 space-y-2 text-sm text-foreground/75">
              <li><Link className="hover:text-primary" href="/site/services">Services</Link></li>
              <li><Link className="hover:text-primary" href="/site/pricing">Pricing</Link></li>
              <li><Link className="hover:text-primary" href="/site/appointment">Book Appointment</Link></li>
              <li><Link className="hover:text-primary" href="/support">Support</Link></li>
            </ul>
          </div>

          {/* Legal + CTA */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Legal</h4>
            <ul className="mt-3 space-y-2 text-sm text-foreground/75">
              <li><Link className="hover:text-primary" href="/terms">Terms of Service</Link></li>
              <li><Link className="hover:text-primary" href="/privacy">Privacy Policy</Link></li>
            </ul>

            <div className="mt-5 flex items-center gap-4 text-foreground/60">
              <Link href="#" aria-label="Facebook" className="hover:text-primary">
                <FaFacebook size={18} />
              </Link>
              <Link href="#" aria-label="Twitter" className="hover:text-primary">
                <FaTwitter size={18} />
              </Link>
              <Link href="#" aria-label="LinkedIn" className="hover:text-primary">
                <FaLinkedin size={18} />
              </Link>
              <Link href="#" aria-label="Instagram" className="hover:text-primary">
                <FaInstagram size={18} />
              </Link>
            </div>

            <div className="mt-6">
              <Link
                href="/waitlist"
                className="inline-flex rounded-2xl px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
                style={{ background: "var(--brand-gradient)" }}
              >
                Join the Waitlist
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} SW Tax Service. All rights reserved.</p>

          <div className="flex gap-4">
            <Link className="hover:text-primary" href="/privacy">Privacy</Link>
            <Link className="hover:text-primary" href="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
