"use client";

import { useState } from "react";
import Link from "next/link";
import { FaBars, FaTimes } from "react-icons/fa";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <nav className="max-w-6xl mx-auto flex justify-between items-center py-4 px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-2xl font-extrabold text-blue-900">
            SW Tax <span className="text-yellow-500">Service</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-8">
          <Link
            href="/"
            className="text-gray-700 hover:text-blue-700 transition-colors"
          >
            Home
          </Link>
          <Link
            href="/services"
            className="text-gray-700 hover:text-blue-700 transition-colors"
          >
            Services
          </Link>
          <Link
            href="/lms"
            className="text-gray-700 hover:text-blue-700 transition-colors"
          >
            LMS for Tax Pros
          </Link>
          <Link
            href="/site/appointment"
            className="text-gray-700 hover:text-blue-700 transition-colors"
          >
            Appointment
          </Link>
          <Link
            href="/site/waitlist"
            className="text-gray-700 hover:text-blue-700 transition-colors"
          >
            Waitlist
          </Link>
          <Link
            href="/sign-in"
            className="px-5 py-2 bg-blue-900 text-white font-semibold rounded-full hover:bg-blue-800 transition-all duration-300"
          >
            Sign In
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-blue-900 focus:outline-none"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <FaTimes size={22} /> : <FaBars size={22} />}
        </button>
      </nav>

      {/* Mobile Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="flex flex-col items-center space-y-4 py-6 text-gray-800">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="hover:text-blue-700 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/services"
              onClick={() => setIsOpen(false)}
              className="hover:text-blue-700 transition-colors"
            >
              Services
            </Link>
            <Link
              href="/lms"
              onClick={() => setIsOpen(false)}
              className="hover:text-blue-700 transition-colors"
            >
              LMS for Tax Pros
            </Link>
            <Link
              href="/site/appointment"
              onClick={() => setIsOpen(false)}
              className="hover:text-blue-700 transition-colors"
            >
              Appointment
            </Link>
            <Link
              href="/site/waitlist"
              onClick={() => setIsOpen(false)}
              className="hover:text-blue-700 transition-colors"
            >
              Waitlist
            </Link>
            <Link
              href="/sign-in"
              onClick={() => setIsOpen(false)}
              className="px-5 py-2 bg-blue-900 text-white font-semibold rounded-full hover:bg-blue-800 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
