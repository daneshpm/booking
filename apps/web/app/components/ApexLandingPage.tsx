'use client';

import * as React from 'react';
import { Navbar } from './landing/Navbar';
import { HeroSection } from './landing/HeroSection';
import { ServicesSection, ServiceCardData } from './landing/ServicesSection';
import { HowItWorksSection } from './landing/HowItWorksSection';
import { CentersOfExcellenceSection } from './landing/CentersOfExcellenceSection';
import { ExpertsSection, StaffMemberData } from './landing/ExpertsSection';
import { WhyRoomanSection } from './landing/WhyRoomanSection';
import { FaqSection } from './landing/FaqSection';
import { FinalCtaSection } from './landing/FinalCtaSection';
import { Footer } from './landing/Footer';

export interface LandingService extends ServiceCardData {}
export interface LandingStaff extends StaffMemberData {}

interface ApexLandingPageProps {
  defaultWorkspaceSlug?: string;
  services?: LandingService[];
  staff?: LandingStaff[];
}

export function ApexLandingPage({
  defaultWorkspaceSlug,
  services = [],
  staff = [],
}: ApexLandingPageProps = {}) {
  const targetSlug =
    defaultWorkspaceSlug ||
    process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_SLUG?.trim() ||
    'rooman-technologies';

  const hasValidMentors = staff.some(
    (s) => !s.isOwner && (s.headline || s.bio || s.avatarUrl || s.displayName)
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-[#5c34ad] selection:text-white">
      {/* 1. Global Navigation Bar */}
      <Navbar workspaceSlug={targetSlug} hasStaff={hasValidMentors} />

      {/* 2. Hero Section with Interactive Booking Preview */}
      <HeroSection workspaceSlug={targetSlug} services={services} />

      {/* 3. Real Workspace Services Section */}
      <ServicesSection workspaceSlug={targetSlug} services={services} />

      {/* 4. How It Works (3-Step Stepper) */}
      <HowItWorksSection />

      {/* 5. Centers of Excellence & University Partnerships */}
      <CentersOfExcellenceSection workspaceSlug={targetSlug} />

      {/* 6. Real Mentors / Experts (conditionally omitted if no real staff exist) */}
      <ExpertsSection workspaceSlug={targetSlug} staff={staff} />

      {/* 7. Why Rooman Technologies (6 Value Pillars) */}
      <WhyRoomanSection />

      {/* 8. Frequently Asked Questions Accordion */}
      <FaqSection />

      {/* 9. Final Conversion CTA Banner */}
      <FinalCtaSection workspaceSlug={targetSlug} />

      {/* 10. Footer with Rooman Branding & Legal Notice */}
      <Footer workspaceSlug={targetSlug} />
    </div>
  );
}
