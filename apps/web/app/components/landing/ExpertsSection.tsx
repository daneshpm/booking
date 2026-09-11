'use client';

import * as React from 'react';
import Link from 'next/link';
import { Users, ArrowRight, CheckCircle2 } from 'lucide-react';

export interface StaffMemberData {
  id: string;
  name: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  headline: string | null;
  /** True when this staff row belongs to the workspace's OWNER-role member. */
  isOwner: boolean;
}

interface ExpertsSectionProps {
  workspaceSlug: string;
  staff?: StaffMemberData[];
}

export function ExpertsSection({ workspaceSlug, staff = [] }: ExpertsSectionProps) {
  // STRICT RULE: If no real staff members exist in database, do NOT show fabricated mentors.
  // Filter out internal system placeholder users who lack actual mentor profile/headline/bio.
  const mentors = (staff || []).filter(
    (member) =>
      !member.isOwner && (member.headline || member.bio || member.avatarUrl || member.displayName)
  );

  if (mentors.length === 0) {
    return null;
  }

  return (
    <section
      id="experts"
      className="py-20 sm:py-28 bg-white border-t border-slate-100 scroll-mt-16"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5c34ad]/10 text-[#5c34ad] text-xs font-bold uppercase tracking-wider">
            <Users className="h-3.5 w-3.5" />
            <span>Consultation Specialists</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Meet Our Industry Mentors
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Learn directly from active technical specialists and enterprise instructors dedicated to
            your advancement.
          </p>
        </div>

        {/* Real Staff Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mentors.map((member) => {
            const displayName = member.displayName || member.name;
            const initials = displayName
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div
                key={member.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs hover:shadow-lg transition-all"
              >
                <div className="space-y-4">
                  {/* Avatar & Header */}
                  <div className="flex items-center gap-4">
                    {member.avatarUrl ? (
                      <div className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-[#5c34ad]/20">
                        <img
                          src={member.avatarUrl}
                          alt={displayName}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-[#5c34ad]/10 text-[#5c34ad] flex items-center justify-center font-bold text-lg border border-[#5c34ad]/20">
                        {initials}
                      </div>
                    )}
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{displayName}</h3>
                      <p className="text-xs text-[#5c34ad] font-semibold">
                        {member.headline || 'Technical Advisor & Mentor'}
                      </p>
                    </div>
                  </div>

                  {/* Bio */}
                  {member.bio && (
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                      {member.bio}
                    </p>
                  )}
                </div>

                {/* Book Action */}
                <div className="pt-6 mt-4 border-t border-slate-100">
                  <Link
                    href={`/book/${workspaceSlug}`}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-[#5c34ad] text-white text-xs font-bold transition-colors"
                  >
                    <span>Book a Session →</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
