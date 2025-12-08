"use client";

import Link from "next/link";
import { FaFacebook, FaTwitter, FaLinkedin, FaInstagram } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white py-12 px-6 overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-yellow-400/20 rounded-full blur-3xl opacity-40 animate-pulse" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl opacity-40 animate-pulse" />

      <div className="relative z-10 max-w-6xl mx-auto grid md:grid-cols-3 gap-8 text-center md:text-left">
        {/* Logo & Description */}
        <div>
          <h3 className="text-2xl font-bold text-yellow-400">All-In-Well Tax</h3>
          <p className="mt-3 text-blue-100 text-sm leading-relaxed">
            Your trusted partner for secure, accurate, and stress-free tax filing — for individuals, businesses, and professionals.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-lg font-semibold text-white mb-3">Quick Links</h4>
          <ul className="space-y-2 text-blue-100 text-sm">
            <li>
              <Link href="/site/services" className="hover:text-yellow-300 transition-colors">
                Services
              </Link>
            </li>
            <li>
              <Link href="/site/pricing" className="hover:text-yellow-300 transition-colors">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/site/appointment" className="hover:text-yellow-300 transition-colors">
                Book Appointment
              </Link>
            </li>
            <li>
              <Link href="/support" className="hover:text-yellow-300 transition-colors">
                Support
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal & Social */}
        <div>
          <h4 className="text-lg font-semibold text-white mb-3">Legal</h4>
          <ul className="space-y-2 text-blue-100 text-sm">
            <li>
              <Link href="/terms" className="hover:text-yellow-300 transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-yellow-300 transition-colors">
                Privacy Policy
              </Link>
            </li>
          </ul>

          {/* Social icons */}
          <div className="flex justify-center md:justify-start gap-4 mt-5 text-blue-200">
            <Link href="#" aria-label="Facebook" className="hover:text-yellow-400 transition-colors">
              <FaFacebook size={20} />
            </Link>
            <Link href="#" aria-label="Twitter" className="hover:text-yellow-400 transition-colors">
              <FaTwitter size={20} />
            </Link>
            <Link href="#" aria-label="LinkedIn" className="hover:text-yellow-400 transition-colors">
              <FaLinkedin size={20} />
            </Link>
            <Link href="#" aria-label="Instagram" className="hover:text-yellow-400 transition-colors">
              <FaInstagram size={20} />
            </Link>
          </div>
        </div>
      </div>

      {/* Copyright line */}
      <div className="relative z-10 border-t border-blue-700 mt-10 pt-6 text-center text-sm text-blue-200">
        © {new Date().getFullYear()} All-In-Well Tax Firm. All rights reserved.
      </div>
    </footer>
  );
}
