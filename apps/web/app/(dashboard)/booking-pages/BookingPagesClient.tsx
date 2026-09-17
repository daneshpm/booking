'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Globe,
  ExternalLink,
  Copy,
  Code2,
  CheckCircle2,
  X,
  Palette,
  Signpost,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Label,
  Input,
  Select,
} from '@bookings/ui';
import {
  updateBookingPageBrandingAction,
  saveRoutingFormAction,
  type BrandingInput,
  type RoutingFormInput,
} from './actions';

interface ServiceItem {
  id: string;
  name: string;
  slug: string;
}

interface BrandingSettings {
  brandColor: string | null;
  bookingWelcomeTitle: string | null;
  bookingWelcomeMessage: string | null;
}

interface RoutingFormSettings {
  question: string;
  isEnabled: boolean;
  options: Array<{ serviceId: string; label: string }>;
}

interface BookingPagesClientProps {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  services: ServiceItem[];
  branding: BrandingSettings;
  routingForm: RoutingFormSettings | null;
}

const DEFAULT_BRAND_COLOR = '#5c34ad';

export function BookingPagesClient({
  workspaceId,
  workspaceName,
  workspaceSlug,
  services,
  branding,
  routingForm,
}: BookingPagesClientProps) {
  const [copiedLink, setCopiedLink] = React.useState<string | null>(null);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = React.useState(false);
  const [embedTab, setEmbedTab] = React.useState<'iframe' | 'button' | 'signature'>('iframe');
  const [selectedEmbedSlug, setSelectedEmbedSlug] = React.useState(workspaceSlug);

  const [brandColor, setBrandColor] = React.useState(branding.brandColor || DEFAULT_BRAND_COLOR);
  const [welcomeTitle, setWelcomeTitle] = React.useState(branding.bookingWelcomeTitle ?? '');
  const [welcomeMessage, setWelcomeMessage] = React.useState(branding.bookingWelcomeMessage ?? '');
  const [isSavingBranding, setIsSavingBranding] = React.useState(false);
  const [brandingSaved, setBrandingSaved] = React.useState(false);
  const [brandingError, setBrandingError] = React.useState<string | null>(null);

  const [routingQuestion, setRoutingQuestion] = React.useState(
    routingForm?.question || 'What can we help you with?'
  );
  const [routingEnabled, setRoutingEnabled] = React.useState(routingForm?.isEnabled ?? false);
  const [routingOptions, setRoutingOptions] = React.useState<
    Array<{ serviceId: string; label: string }>
  >(routingForm?.options.length ? routingForm.options : []);
  const [isSavingRouting, setIsSavingRouting] = React.useState(false);
  const [routingSaved, setRoutingSaved] = React.useState(false);
  const [routingError, setRoutingError] = React.useState<string | null>(null);

  const handleSaveBranding = async () => {
    setIsSavingBranding(true);
    setBrandingError(null);
    setBrandingSaved(false);
    const input: BrandingInput = {
      brandColor,
      bookingWelcomeTitle: welcomeTitle || null,
      bookingWelcomeMessage: welcomeMessage || null,
    };
    const res = await updateBookingPageBrandingAction(workspaceId, input);
    if (res.success) {
      setBrandingSaved(true);
      setTimeout(() => setBrandingSaved(false), 3000);
    } else {
      setBrandingError(res.error || 'Could not save branding.');
    }
    setIsSavingBranding(false);
  };

  const addRoutingOption = () => {
    if (services.length === 0) return;
    setRoutingOptions((prev) => [...prev, { serviceId: services[0].id, label: '' }]);
  };

  const removeRoutingOption = (index: number) => {
    setRoutingOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRoutingOption = (
    index: number,
    patch: Partial<{ serviceId: string; label: string }>
  ) => {
    setRoutingOptions((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  };

  const handleSaveRouting = async () => {
    setIsSavingRouting(true);
    setRoutingError(null);
    setRoutingSaved(false);
    const input: RoutingFormInput = {
      question: routingQuestion,
      isEnabled: routingEnabled,
      options: routingOptions,
    };
    const res = await saveRoutingFormAction(workspaceId, input);
    if (res.success) {
      setRoutingSaved(true);
      setTimeout(() => setRoutingSaved(false), 3000);
    } else {
      setRoutingError(res.error || 'Could not save the routing form.');
    }
    setIsSavingRouting(false);
  };

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

  const buttonSnippet = `<!-- Rooman Bookings Floating Button Widget -->
<script
  src="${baseUrl}/widget.js"
  data-booking-url="${embedUrl}"
  data-button-text="Schedule an Appointment"
  data-theme="#5c34ad"
  async
></script>`;

  const signatureSnippet = `<a href="${mainPortalUrl}" style="color: #5c34ad; font-weight: bold; text-decoration: underline;">
  Click here to schedule a meeting with ${workspaceName}
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
            Shareable client booking portals, direct event links, and responsive website embed
            widgets.
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
                  Displays all active services for{' '}
                  <strong className="text-slate-700 capitalize">{workspaceName}</strong>
                </span>
              </div>
            </div>

            <Badge variant="purple">Primary Portal</Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <div className="p-3.5 rounded-xl bg-[#f8f5ff] border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="font-mono text-purple-950 font-bold truncate">{mainPortalUrl}</div>

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
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-[#5c34ad] hover:bg-[#4d2994] text-white gap-1.5 text-xs"
                >
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

      {/* Branding */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: brandColor }}
            >
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">Branding</CardTitle>
              <CardDescription className="text-xs">
                The accent color and intro copy shown on your public booking page.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {brandingError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {brandingError}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Label className="mb-0 whitespace-nowrap">Accent Color</Label>
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-9 w-14 rounded-lg border border-slate-200 cursor-pointer bg-white"
            />
            <Input
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="w-32 text-xs font-mono"
              maxLength={7}
            />
          </div>

          <div>
            <Label htmlFor="welcome-title">Welcome Title</Label>
            <Input
              id="welcome-title"
              placeholder="Schedule an Appointment"
              value={welcomeTitle}
              onChange={(e) => setWelcomeTitle(e.target.value)}
              maxLength={120}
            />
          </div>

          <div>
            <Label htmlFor="welcome-message">Welcome Message</Label>
            <Input
              id="welcome-message"
              placeholder="Choose an appointment type below to view open dates and instant time slots."
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              maxLength={300}
            />
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={handleSaveBranding}
            isLoading={isSavingBranding}
            className="gap-2 bg-[#5c34ad] hover:bg-[#4d2994]"
          >
            {brandingSaved ? <CheckCircle2 className="h-4 w-4" /> : null}
            {brandingSaved ? 'Saved' : 'Save Branding'}
          </Button>
        </CardContent>
      </Card>

      {/* Routing Form */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                <Signpost className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">Routing Form</CardTitle>
                <CardDescription className="text-xs">
                  Ask one question before the service list and send customers straight to the
                  matching service.
                </CardDescription>
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none shrink-0">
              <input
                type="checkbox"
                checked={routingEnabled}
                onChange={(e) => setRoutingEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#5c34ad] focus:ring-[#5c34ad]/30"
              />
              Enabled
            </label>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {routingError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {routingError}
            </div>
          )}

          <div>
            <Label htmlFor="routing-question">Question</Label>
            <Input
              id="routing-question"
              value={routingQuestion}
              onChange={(e) => setRoutingQuestion(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="mb-0">Options</Label>
              <button
                type="button"
                onClick={addRoutingOption}
                disabled={services.length === 0}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5c34ad] hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Option
              </button>
            </div>

            {routingOptions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                No options yet. Add one for each answer that should route to a specific service.
              </p>
            ) : (
              routingOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder="Answer label, e.g. New Client"
                    value={option.label}
                    onChange={(e) => updateRoutingOption(index, { label: e.target.value })}
                    className="flex-1 text-xs"
                  />
                  <Select
                    value={option.serviceId}
                    onChange={(e) => updateRoutingOption(index, { serviceId: e.target.value })}
                    className="w-48 text-xs"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                  <button
                    type="button"
                    onClick={() => removeRoutingOption(index)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove option"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={handleSaveRouting}
            isLoading={isSavingRouting}
            className="gap-2 bg-[#5c34ad] hover:bg-[#4d2994]"
          >
            {routingSaved ? <CheckCircle2 className="h-4 w-4" /> : null}
            {routingSaved ? 'Saved' : 'Save Routing Form'}
          </Button>
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
                <p>
                  3. Client appointments automatically synchronize directly into your dashboard
                  calendar.
                </p>
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
