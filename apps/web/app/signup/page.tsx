'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { Button, Input } from '@bookings/ui';
import { signupUserAction } from './actions';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [workspaceName, setWorkspaceName] = React.useState('rooman');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !workspaceName) {
      setErrorMsg('Please enter your name, email, and workspace name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await signupUserAction({
        name,
        email,
        workspaceName,
        password,
      });

      if (res.success) {
        router.push('/appointments');
      } else {
        setErrorMsg(res.error || 'Failed to create workspace. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Top Brand Logo */}
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
          Start your 15-day free trial
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          No credit card required • Instant automated setup
        </p>
      </div>

      {/* Form Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-2xl border border-slate-200/80 sm:px-10">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Your Full Name *
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. Rooman Developer"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Workspace Name (Your Organization) *
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. rooman"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full text-sm bg-white"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Your portal will be: bookings.local/{workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'workspace'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Work Email Address *
              </label>
              <Input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm bg-white"
              />
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
                    Create Account & Enter Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-purple-700 hover:text-purple-900">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
