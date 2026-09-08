'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { Button, Input } from '@bookings/ui';
import { loginUserAction } from '../signup/actions';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter your email address and password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await loginUserAction(email, password);
      if (res.success) {
        // Only follow an in-app path, so a crafted ?next= cannot bounce the
        // user to another site straight after authenticating.
        const target =
          nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')
            ? nextPath
            : '/appointments';
        router.push(target);
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to sign in.');
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
          Sign In to Your Workspace
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Enter your email and password to access your dashboard
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
              <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1">
                Email Address *
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm bg-white"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-700 mb-1">
                Password *
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm bg-white"
              />
              <Link
                href="/reset-password"
                className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 mt-1.5 inline-block"
              >
                Forgot your password?
              </Link>
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
                    Signing in...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Enter Workspace Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-bold text-purple-700 hover:text-purple-900">
              Create your workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={null}>
      <LoginForm />
    </React.Suspense>
  );
}
