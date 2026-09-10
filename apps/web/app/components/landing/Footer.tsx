'use client';

import * as React from 'react';
import Link from 'next/link';
import { ExternalLink, ShieldCheck, ArrowRight } from 'lucide-react';

interface FooterProps {
  workspaceSlug: string;
}

export function Footer({ workspaceSlug }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-50 border-t border-slate-200/80 text-slate-600 text-sm">
      <div className="max-w-7xl mx-auto px-6 sm:px-12 py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 lg:gap-12">
          {/* Col 1: Brand & Bio */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <img
                src="/rooman-logo.png"
                alt="Rooman Technologies"
                className="h-7 w-auto object-contain transition-transform group-hover:opacity-90"
              />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400 pl-3 border-l border-slate-200">
                Bookings
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm">
              Rooman Technologies is a pioneer in vocational IT education, university Centers of
              Excellence, and enterprise workforce skilling with over three decades of national
              leadership.
            </p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs font-semibold text-slate-600 shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>NSDC Partner • National Award Winner</span>
            </div>
          </div>

          {/* Col 2: Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#services" className="hover:text-[#5c34ad] transition-colors">
                  Consultation Programs
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-[#5c34ad] transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#coe" className="hover:text-[#5c34ad] transition-colors">
                  Centers of Excellence
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[#5c34ad] transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Portal & Access */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Access & Booking
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href={`/book/${workspaceSlug}`}
                  className="text-[#5c34ad] hover:text-[#4d2994] transition-colors font-bold inline-flex items-center gap-1"
                >
                  <span>Book a Session</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#5c34ad] transition-colors">
                  Staff & Admin Sign In
                </Link>
              </li>
              <li>
                <a
                  href="https://www.rooman.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#5c34ad] transition-colors inline-flex items-center gap-1"
                >
                  <span>Rooman Official Website</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Terms */}
        <div className="mt-12 pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            © {currentYear} Rooman Technologies Pvt. Ltd. Bengaluru, India. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-600 transition-colors cursor-pointer">
              Privacy Policy
            </span>
            <span className="hover:text-slate-600 transition-colors cursor-pointer">
              Terms of Service
            </span>
            <span className="hover:text-slate-600 transition-colors cursor-pointer">Support</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
