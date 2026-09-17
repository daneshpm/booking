'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Check, Loader2, X, ShieldCheck, Users } from 'lucide-react';
import { Button, Input } from '@bookings/ui';
import {
  checkInvitationAction,
  acceptInvitationAsNewUserAction,
  acceptInvitationForExistingUserAction,
} from './actions';

/** Mirrors the server-side policy so the form can show progress. */
const RULES: Array<{ label: string; test: (value: string) => boolean }> = [
  { label: 'At least 10 characters', test: (v) => v.length >= 10 },
  { label: 'An uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'A lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'A number', test: (v) => /[0-9]/.test(v) },
];

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  STAFF: 'Staff',
  RECEPTIONIST: 'Receptionist',
};

function AcceptInviteForm() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';

  const [checking, setChecking] = React.useState(true);
  const [preview, setPreview] = React.useState<Awaited<
    ReturnType<typeof checkInvitationAction>
  > | null>(null);

  const [name, setName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmation, setConfirmation] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    if (!token) {
      setChecking(false);
      return;
    }
    checkInvitationAction(token)
      .then((res) => {
        if (!cancelled) setPreview(res);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const checks = RULES.map((rule) => ({ ...rule, passed: rule.test(password) }));
  const ready =
    checks.every((c) => c.passed) && password === confirmation && name.trim().length > 0;

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password !== confirmation) {
      setErrorMsg('The two passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await acceptInvitationAsNewUserAction(token, { name, password });
      if (res.success) {
        setDone(true);
        setTimeout(() => router.push('/appointments'), 1500);
      } else {
        setErrorMsg(res.error || 'Could not accept this invitation.');
      }
    } catch {
      setErrorMsg('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptExisting = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await acceptInvitationForExistingUserAction(token);
      if (res.success) {
        setDone(true);
        setTimeout(() => router.push('/appointments'), 1500);
      } else {
        setErrorMsg(res.error || 'Could not accept this invitation.');
      }
    } catch {
      setErrorMsg('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex flex-col items-center gap-2">
          <img
            src="/rooman-logo.png"
            alt="Rooman Technologies"
            className="h-9 w-auto object-contain"
          />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Bookings Portal
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-extrabold text-slate-900 tracking-tight">
          Join your team
        </h2>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl border border-slate-200/80 sm:px-10">
          {checking ? (
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking your invitation...
            </div>
          ) : done ? (
            <div className="text-center space-y-3">
              <ShieldCheck className="h-8 w-8 text-emerald-600 mx-auto" />
              <p className="text-sm font-bold text-slate-900">You're in!</p>
              <p className="text-xs text-slate-500">Taking you to your dashboard.</p>
            </div>
          ) : !preview?.valid ? (
            <div className="text-center space-y-3">
              <p className="text-sm font-bold text-slate-900">This invitation is no longer valid</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Invitations expire after a few days and can be used once. Ask whoever invited you to
                send a new one.
              </p>
              <Link
                href="/login"
                className="inline-block pt-2 text-xs font-bold text-purple-700 hover:text-purple-900"
              >
                Go to login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-5 p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-start gap-2">
                <Users className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  You've been invited to join <strong>{preview.workspaceName}</strong> as{' '}
                  <strong>{ROLE_LABELS[preview.role ?? ''] || preview.role}</strong>.
                </span>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
                >
                  {errorMsg}
                </div>
              )}

              {preview.accountExists ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600">
                    An account already exists for <strong>{preview.email}</strong>. Log in with that
                    account, then come back and accept.
                  </p>
                  <Button
                    type="button"
                    onClick={handleAcceptExisting}
                    disabled={isSubmitting}
                    className="w-full bg-[#5c34ad] hover:bg-[#4a2694] text-white font-extrabold text-sm py-3 rounded-xl shadow-lg shadow-purple-900/20 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Accepting...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        Accept invitation
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                  <Link
                    href={`/login?next=${encodeURIComponent(`/accept-invite?token=${token}`)}`}
                    className="block text-center text-xs font-bold text-purple-700 hover:text-purple-900"
                  >
                    Log in first
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-xs font-bold text-slate-700 mb-1">
                      Your name *
                    </label>
                    <Input
                      id="name"
                      required
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-sm bg-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Choose a password *
                    </label>
                    <Input
                      id="password"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-sm bg-white"
                    />
                    <ul className="mt-2 space-y-1">
                      {checks.map((check) => (
                        <li
                          key={check.label}
                          className={`flex items-center gap-1.5 text-[11px] ${
                            check.passed ? 'text-emerald-600' : 'text-slate-400'
                          }`}
                        >
                          {check.passed ? (
                            <Check className="h-3 w-3 shrink-0" />
                          ) : (
                            <X className="h-3 w-3 shrink-0" />
                          )}
                          {check.label}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <label
                      htmlFor="confirm"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Confirm password *
                    </label>
                    <Input
                      id="confirm"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                      className="w-full text-sm bg-white"
                    />
                    {confirmation.length > 0 && password !== confirmation && (
                      <span className="text-[11px] text-rose-600 mt-1 block">
                        These do not match.
                      </span>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || !ready}
                    className="w-full bg-[#5c34ad] hover:bg-[#4a2694] text-white font-extrabold text-sm py-3 rounded-xl shadow-lg shadow-purple-900/20 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Joining...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        Create account & join
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <React.Suspense fallback={null}>
      <AcceptInviteForm />
    </React.Suspense>
  );
}
