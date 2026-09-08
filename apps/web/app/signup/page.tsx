'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Check, X } from 'lucide-react';
import { Button, Input } from '@bookings/ui';
import { signupUserAction } from './actions';

/** Mirrors the server-side policy in @bookings/auth so the UI can show progress. */
const RULES: Array<{ label: string; test: (value: string) => boolean }> = [
  { label: 'At least 10 characters', test: (v) => v.length >= 10 },
  { label: 'An uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { label: 'A lowercase letter', test: (v) => /[a-z]/.test(v) },
  { label: 'A number', test: (v) => /[0-9]/.test(v) },
];

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [workspaceName, setWorkspaceName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  const passwordChecks = RULES.map((rule) => ({ ...rule, passed: rule.test(password) }));
  const passwordReady = passwordChecks.every((c) => c.passed);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFieldErrors({});

    if (!name || !email || !workspaceName || !password) {
      setErrorMsg('Please fill in every field.');
      return;
    }
    if (!passwordReady) {
      setErrorMsg('Please choose a password that meets all the requirements.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signupUserAction({ name, email, workspaceName, password });
      if (res.success) {
        router.push('/appointments');
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to create workspace. Please try again.');
        setFieldErrors(res.fieldErrors || {});
      }
    } catch {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const slugPreview =
    workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'workspace';

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
          Create your workspace
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Set up scheduling for your team in a couple of minutes
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl border border-slate-200/80 sm:px-10">
          {errorMsg && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-bold text-slate-700 mb-1">
                Your Full Name *
              </label>
              <Input
                id="name"
                type="text"
                required
                autoComplete="name"
                placeholder="e.g. Priya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm bg-white"
              />
              {fieldErrors.name?.map((msg) => (
                <span key={msg} className="text-[11px] text-rose-600 mt-1 block">
                  {msg}
                </span>
              ))}
            </div>

            <div>
              <label
                htmlFor="workspaceName"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Workspace Name (Your Organization) *
              </label>
              <Input
                id="workspaceName"
                type="text"
                required
                autoComplete="organization"
                placeholder="e.g. Rooman Technologies"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full text-sm bg-white"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Your booking page will be at /book/{slugPreview}
              </span>
              {fieldErrors.workspaceName?.map((msg) => (
                <span key={msg} className="text-[11px] text-rose-600 mt-1 block">
                  {msg}
                </span>
              ))}
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1">
                Work Email Address *
              </label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm bg-white"
              />
              {fieldErrors.email?.map((msg) => (
                <span key={msg} className="text-[11px] text-rose-600 mt-1 block">
                  {msg}
                </span>
              ))}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-700 mb-1">
                Password *
              </label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Choose a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm bg-white"
              />
              <ul className="mt-2 space-y-1">
                {passwordChecks.map((check) => (
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
              {fieldErrors.password?.map((msg) => (
                <span key={msg} className="text-[11px] text-rose-600 mt-1 block">
                  {msg}
                </span>
              ))}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#5c34ad] hover:bg-[#4a2694] text-white font-extrabold text-sm py-3 rounded-xl shadow-lg shadow-purple-900/20"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Setting up your workspace...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Create Account &amp; Enter Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-purple-700 hover:text-purple-900">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
