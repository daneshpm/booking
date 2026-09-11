'use client';

import * as React from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

export function FaqSection() {
  const [openIndices, setOpenIndices] = React.useState<number[]>([0]);

  const toggleItem = (index: number) => {
    setOpenIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const faqs: FaqItem[] = [
    {
      question: 'How do I book a consultation session?',
      answer:
        'Select your preferred consultation track on this page or through the booking portal, choose a convenient date and available time slot, enter your contact information, and confirm your booking. You will instantly receive an email confirmation containing your Google Meet video link and calendar invite.',
    },
    {
      question: 'Are consultation sessions conducted online or in person?',
      answer:
        'All standard consultations booked via this platform are conducted 1-on-1 online via Google Meet. For customized corporate cohorts or campus Center of Excellence planning, hybrid and on-premise consultations can also be coordinated.',
    },
    {
      question: 'What technologies and career tracks are covered?',
      answer:
        'Rooman specialists provide guidance across foundational and advanced technical domains including Cloud Computing (AWS, Azure), Cybersecurity, Artificial Intelligence & Machine Learning, Networking & Hardware, DevOps, and Enterprise IT Infrastructure.',
    },
    {
      question: 'How much do consultation sessions cost?',
      answer:
        'Pricing depends on the specific consultation track selected. Introductory career pathway evaluations are frequently offered at no charge (Free), while specialized technical assessments or deep architectural advisory sessions reflect standard fees as displayed on each service card.',
    },
    {
      question: 'Can I reschedule or cancel my booking?',
      answer:
        'Yes. You can reschedule or cancel your session up to 24 hours in advance directly through the manage-booking link provided in your confirmation email.',
    },
    {
      question: 'What should I prepare before joining the 1-on-1 session?',
      answer:
        'To get the highest value from your session, have your latest resume or LinkedIn profile accessible, along with 2-3 specific questions regarding your target technical roles, certification ambitions, or challenges you wish to address.',
    },
    {
      question: 'How does Rooman Technologies support enterprise workforce training?',
      answer:
        'Rooman collaborates with enterprise organizations to assess skill gaps, architect role-based training programs, and deliver hands-on cohort learning with lab access, ensuring engineers transition seamlessly into new technology stacks.',
    },
    {
      question: 'Can academic institutions partner with Rooman for Centers of Excellence?',
      answer:
        'Yes. Rooman establishes state-of-the-art Centers of Excellence (CoE) within universities and colleges, integrating lab setups, teacher enablement, and student skilling mapped to national and global industry standards.',
    },
  ];

  return (
    <section id="faq" className="py-20 sm:py-28 bg-slate-50/50 scroll-mt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5c34ad]/10 text-[#5c34ad] text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Everything you need to know
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Answers to common questions regarding booking, session format, and program pathways.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndices.includes(idx);
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/80 bg-white transition-all overflow-hidden shadow-xs hover:border-slate-300"
              >
                <button
                  type="button"
                  onClick={() => toggleItem(idx)}
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c34ad]"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-bold text-slate-900 pr-4">{faq.question}</span>
                  <div
                    className={`h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 bg-[#5c34ad]/10 text-[#5c34ad]' : ''
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 animate-in fade-in-50 duration-150">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
