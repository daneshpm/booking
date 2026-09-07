'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Globe,
  ExternalLink,
  Copy,
  Code2,
  Share2,
  CheckCircle2,
  QrCode,
  X,
  Layers,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@bookings/ui';

interface ServiceItem {
  id: string;
  name: string;
  slug: string;
}

interface BookingPagesClientProps {
  workspaceName: string;
  workspaceSlug: string;
  services: ServiceItem[];
}

export function BookingPagesClient({
  workspaceName,
  workspaceSlug,
  services,
}: BookingPagesClientProps) {
  const [copiedLink, setCopiedLink] = React.useState<string | null>(null);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = React.useState(false);
  const [embedTab, setEmbedTab] = React.useState<'iframe' | 'button' | 'signature'>('iframe');
  const [selectedEmbedSlug, setSelectedEmbedSlug] = React.useState(workspaceSlug);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const mainPortalUrl = `${baseUrl}/book/${workspaceSlug}`;
  const embedUrl = `${baseUrl}/book/${selectedEmbedSlug}`;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const iframeSnippet = `<iframe
  src="${embedUrl}"
  width="100%"
  height="720px"
  frameborder="0"
  style="border: none; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);"
></iframe>`;

  const buttonSnippet = `<!-- ApexBookings Floating Button Widget -->
<script
  src="${baseUrl}/widget.js"
  data-booking-url="${embedUrl}"
  data-button-text="Schedule an Appointment"
  data-theme="#5c34ad"
  async
></script>`;

  const signatureSnippet = `<a href="${mainPortalUrl}" style="color: #5c34ad; font-weight: bold; text-decoration: underline;">
  📅 Click here to schedule a meeting with ${workspaceName}
</a>`;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Booking Pages & Website Embeds
            </h1>
            <Badge variant="success">Live & Published</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Shareable client booking portals, direct event links, and responsive website embed widgets.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedEmbedSlug(workspaceSlug);
            setIsEmbedModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#5c34ad] hover:bg-[#4d2994] text-white text-xs font-bold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Code2 className="h-4 w-4" />
          <span>Embed on Website</span>
        </button>
      </div>

      {/* Main Business Portal Card */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#5c34ad] flex items-center justify-center text-white font-bold text-sm shadow-md shadow-purple-500/20">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Main Business Booking Portal
                </CardTitle>
                <span className="text-xs text-slate-500">
                  Displays all active services for <strong className="text-slate-700 capitalize">{workspaceName}</strong>
                </span>
              </div>
            </div>

            <Badge variant="purple">Primary Portal</Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <div className="p-3.5 rounded-xl bg-[#f8f5ff] border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="font-mono text-purple-950 font-bold truncate">
              {mainPortalUrl}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => copyToClipboard(mainPortalUrl, 'main')}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-purple-200 text-[#5c34ad] hover:bg-purple-50 rounded-lg font-bold text-xs shadow-2xs transition-colors"
              >
                {copiedLink === 'main' ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <Link href={`/book/${workspaceSlug}`} target="_blank">
                <Button size="sm" variant="primary" className="bg-[#5c34ad] hover:bg-[#4d2994] text-white gap-1.5 text-xs">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open Live
                </Button>
              </Link>
            </div>
          </div>

          {/* Direct Service Booking Links */}
          <div className="pt-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
              Direct Service Booking Links
            </span>
            <div className="grid grid-cols-1 gap-2.5">
              {services.map((s) => {
                const serviceUrl = `${baseUrl}/book/${workspaceSlug}/${s.slug}`;
                return (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-white border border-slate-200 hover:border-purple-200 hover:shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">{s.name}</span>
                      <span className="text-[11px] font-mono text-slate-400">
                        /book/{workspaceSlug}/{s.slug}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(serviceUrl, s.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                        title="Copy direct link"
                      >
                        {copiedLink === s.id ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEmbedSlug(`${workspaceSlug}/${s.slug}`);
                          setIsEmbedModalOpen(true);
                        }}
                        className="px-2 py-1 text-[11px] font-bold text-[#5c34ad] hover:bg-purple-50 rounded-md transition-colors"
                      >
                        Get Embed
                      </button>

                      <Link href={`/book/${workspaceSlug}/${s.slug}`} target="_blank">
                        <Button size="sm" variant="outline" className="text-xs gap-1 py-1">
                          Preview
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Embed Code Generator Modal */}
      {isEmbedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-[#5c34ad]/10 text-[#5c34ad] flex items-center justify-center font-bold">
                  <Code2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Embed Booking Widget</h3>
                  <span className="text-[11px] text-slate-400">Add scheduling to any website</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEmbedModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 pt-3 border-b border-slate-100 flex gap-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setEmbedTab('iframe')}
                className={`pb-2.5 border-b-2 transition-colors ${
                  embedTab === 'iframe'
                    ? 'border-[#5c34ad] text-[#5c34ad]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Inline Iframe
              </button>
              <button
                type="button"
                onClick={() => setEmbedTab('button')}
                className={`pb-2.5 border-b-2 transition-colors ${
                  embedTab === 'button'
                    ? 'border-[#5c34ad] text-[#5c34ad]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Floating Button Widget
              </button>
              <button
                type="button"
                onClick={() => setEmbedTab('signature')}
                className={`pb-2.5 border-b-2 transition-colors ${
                  embedTab === 'signature'
                    ? 'border-[#5c34ad] text-[#5c34ad]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Email Signature Link
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <div className="text-xs text-slate-600">
                {embedTab === 'iframe' &&
                  'Embed the appointment booking calendar directly onto your web page (WordPress, Webflow, Squarespace, or custom HTML):'}
                {embedTab === 'button' &&
                  'Add a floating booking button to the corner of your website that opens your calendar upon click:'}
                {embedTab === 'signature' &&
                  'Paste this link into your Gmail, Outlook, or Apple Mail email signature:'}
              </div>

              {/* Code Snippet Box */}
              <div className="relative">
                <pre className="p-4 bg-slate-900 text-slate-200 rounded-2xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
                  {embedTab === 'iframe' && iframeSnippet}
                  {embedTab === 'button' && buttonSnippet}
                  {embedTab === 'signature' && signatureSnippet}
                </pre>

                <button
                  type="button"
                  onClick={() => {
                    const text =
                      embedTab === 'iframe'
                        ? iframeSnippet
                        : embedTab === 'button'
                        ? buttonSnippet
                        : signatureSnippet;
                    copyToClipboard(text, 'embed-code');
                  }}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 backdrop-blur-xs"
                >
                  {copiedLink === 'embed-code' ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Integration Instructions */}
              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-[11px] text-purple-900 space-y-1">
                <span className="font-bold block">Quick Instructions:</span>
                <p>1. Copy the code snippet above.</p>
                <p>2. Paste it into your website builder HTML embed block or footer template.</p>
                <p>3. Client appointments automatically synchronize directly into your dashboard calendar.</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsEmbedModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
