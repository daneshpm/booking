'use client';

import * as React from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  workspaceSlug: string;
  hasStaff?: boolean;
}

export function Navbar({ workspaceSlug, hasStaff }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const bookUrl = `/book/${workspaceSlug}`;

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 sm:px-12 py-4 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Mark + Primary Navigation Grouped on Left */}
        <div className="flex items-center gap-8 lg:gap-10">
          <Link href="/" className="flex items-center gap-3 group focus:outline-none">
            <img
              src="/rooman-logo.png"
              alt="Rooman Technologies"
              className="h-7 w-auto object-contain transition-transform group-hover:opacity-90"
            />
            <span className="hidden sm:inline-block text-xs font-bold uppercase tracking-widest text-slate-400 pl-3 border-l border-slate-200">
              Bookings
            </span>
          </Link>

          {/* Clean, spacious primary nav grouped next to brand */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#services" className="hover:text-slate-900 transition-colors">
              Programs
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
              How It Works
            </a>
            <a href="#coe" className="hover:text-slate-900 transition-colors">
              Centers of Excellence
            </a>
            {hasStaff && (
              <a href="#experts" className="hover:text-slate-900 transition-colors">
                Experts
              </a>
            )}
            <a href="#faq" className="hover:text-slate-900 transition-colors">
              FAQ
            </a>
          </nav>
        </div>

        {/* Right Action Area - Clean & Uncluttered */}
        <div className="hidden sm:flex items-center gap-5">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Sign In
          </Link>

          <Link
            href={bookUrl}
            className="inline-flex items-center justify-center bg-[#5c34ad] hover:bg-[#4d2994] text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#5c34ad]"
          >
            <span>Book a Session</span>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex sm:hidden items-center gap-2">
          <Link
            href={bookUrl}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#5c34ad] text-white text-xs font-bold"
          >
            Book
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-5 space-y-3 mt-3 animate-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col space-y-2 text-sm font-medium text-slate-700">
            <a
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-[#5c34ad]"
            >
              Programs
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-[#5c34ad]"
            >
              How It Works
            </a>
            <a
              href="#coe"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-[#5c34ad]"
            >
              Centers of Excellence
            </a>
            {hasStaff && (
              <a
                href="#experts"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-[#5c34ad]"
              >
                Experts
              </a>
            )}
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-[#5c34ad]"
            >
              FAQ
            </a>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-slate-50 hover:text-slate-900"
            >
              Sign In
            </Link>
          </div>
          <div className="pt-2 border-t border-slate-100">
            <Link
              href={bookUrl}
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center py-2.5 rounded-lg bg-[#5c34ad] text-white text-xs font-semibold shadow-xs"
            >
              <span>Book a Session</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
