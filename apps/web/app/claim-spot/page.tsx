'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  getClaimSpotDetailsAction,
  claimPublicWaitlistSpotAction,
} from '../book/actions';

export default function ClaimSpotPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#5c34ad]" />
        </div>
      }
    >
      <ClaimSpotContent />
    </React.Suspense>
  );
}

function ClaimSpotContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = React.useState(true);
  const [isClaiming, setIsClaiming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [spotDetails, setSpotDetails] = React.useState<any>(null);
  const [claimedResult, setClaimedResult] = React.useState<any>(null);

  React.useEffect(() => {
    if (!token) {
      setError('No claim token provided in the link.');
      setIsLoading(false);
      return;
    }

    getClaimSpotDetailsAction(token)
      .then((res) => {
        if (!res.success) {
          setError(res.error || 'Failed to find waitlist spot.');
        } else {
          setSpotDetails(res.entry);
        }
      })
      .catch((err) => {
        setError(err.message || 'An error occurred.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  const handleClaim = async () => {
    if (!token) return;
    setIsClaiming(true);
    setError(null);

    try {
      const res = await claimPublicWaitlistSpotAction(token);
      if (!res.success) {
        setError(res.error || 'Failed to claim appointment spot.');
      } else {
        setClaimedResult(res);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-purple-50/20 to-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Header Banner */}
        <div className="px-8 py-6 bg-gradient-to-r from-slate-900 via-[#371e68] to-[#5c34ad] text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-sm mb-3">
            <Sparkles className="h-3.5 w-3.5 fill-current" />
            <span>PRIORITY WAITLIST RECOVERY</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            A Spot Has Opened Up!
          </h1>
          <p className="text-xs text-purple-200 mt-1 max-w-sm mx-auto">
            A previously booked time slot became available and has been reserved for you.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-[#5c34ad]" />
              <span className="text-xs font-semibold">Retrieving your spot details...</span>
            </div>
          ) : claimedResult ? (
            /* Success View */
            <div className="text-center space-y-6 animate-in zoom-in-95 duration-200">
              <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">You Are Booked!</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Your appointment has been locked in and confirmed on the calendar.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left text-xs space-y-3">
                <div className="flex justify-between border-b border-slate-200/80 pb-2.5">
                  <span className="text-slate-500">Client</span>
                  <span className="font-bold text-slate-900">{claimedResult.customerName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/80 pb-2.5">
                  <span className="text-slate-500">Service</span>
                  <span className="font-bold text-slate-900">{claimedResult.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Confirmed Time</span>
                  <span className="font-bold text-[#5c34ad]">{claimedResult.startTime}</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/"
                  className="block w-full py-3 px-4 rounded-xl bg-[#5c34ad] hover:bg-[#4d2994] text-white font-bold text-xs transition-colors shadow-md text-center"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          ) : error ? (
            /* Error / Expired View */
            <div className="text-center space-y-5 animate-in fade-in duration-200 py-4">
              <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Spot Unavailable</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{error}</p>
              </div>
              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-block py-2.5 px-5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
                >
                  Browse Available Services
                </Link>
              </div>
            </div>
          ) : spotDetails ? (
            /* Spot Ready To Claim */
            <div className="space-y-6">
              <div className="bg-purple-50/60 border border-purple-200/80 rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                      {spotDetails.workspaceName}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">
                      {spotDetails.serviceName}
                    </h2>
                  </div>
                  {spotDetails.servicePrice > 0 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                      ${spotDetails.servicePrice.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-purple-100">
                  <div className="flex items-center gap-2 text-slate-700">
                    <CalendarIcon className="h-4 w-4 text-[#5c34ad]" />
                    <span>{spotDetails.preferredDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock className="h-4 w-4 text-[#5c34ad]" />
                    <span>{spotDetails.serviceDuration} mins</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 text-slate-700">
                    <User className="h-4 w-4 text-[#5c34ad]" />
                    <span>Staff: {spotDetails.staffName}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Reserved exclusively for <strong>{spotDetails.customerName}</strong>. Click below to confirm before this priority pass expires.
                </span>
              </div>

              <button
                type="button"
                disabled={isClaiming}
                onClick={handleClaim}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-[#5c34ad] hover:from-amber-600 hover:to-[#4d2994] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Confirming Spot...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-amber-200" />
                    <span>Claim My Appointment Now</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
