'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, Input } from '@servicegrid/ui';
import { BrandLoader } from '../../../components/branding/BrandLoader';
import { BrandLogo } from '../../../components/branding/BrandLogo';
import { getErrorMessage, useAuth } from '../../../lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, api } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetMode, setResetMode] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('expired=1')) {
      setNotice('Your session expired. Please sign in again.');
    }
  }, []);

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace('/');
    } catch (err) {
      setError(getErrorMessage(err, 'Invalid email or password.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError('Enter your work email first.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.forgotPassword(email.trim());
      setNotice(
        res.data.resetToken
          ? `Reset token generated (dev): ${res.data.resetToken}`
          : 'If the account exists, a password reset link has been sent.',
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 10) {
      setError('New password must be at least 10 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await api.resetPassword(resetToken.trim(), newPassword);
      setResetMode(false);
      setNotice('Password reset successful. Sign in with your new password.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <BrandLogo variant="primary" />
          <p className="mt-2 text-sm text-[#475569]">
            Sign in to your FieldSutra operations workspace
          </p>
        </div>

        <Card>
          {notice && (
            <div className="mb-4 rounded-md border border-[#99F6E4] bg-[#F0FDFA] px-3 py-2 text-xs text-[#0F766E]">
              {notice}
            </div>
          )}
          {error && (
            <div role="alert" className="mb-4 rounded-md border border-[#FECDD3] bg-[#FFF1F2] px-3 py-2 text-xs text-[#BE123C]">
              {error}
            </div>
          )}

          {!resetMode ? (
            <form className="space-y-4" onSubmit={handleLogin}>
              <Input
                label="Work Email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ops@company.in"
                required
              />
              <Input
                label="Password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <BrandLoader variant="button" label="Signing in…" /> : 'Sign In'}
              </Button>
              <div className="flex items-center justify-between text-xs text-[#475569]">
                <button
                  type="button"
                  onClick={() => {
                    setResetMode(true);
                    setError(null);
                  }}
                  className="font-medium text-[#0D9488] hover:underline"
                >
                  Forgot password?
                </button>
                <Link href="/register" className="font-medium text-[#0D9488] hover:underline">
                  Create workspace
                </Link>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <form className="space-y-3" onSubmit={handleForgotPassword}>
                <Input
                  label="Work Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ops@company.in"
                  required
                />
                <Button type="submit" variant="secondary" className="w-full" disabled={submitting}>
                  Request Reset Token
                </Button>
              </form>
              <form className="space-y-3 border-t border-[#E2E8F0] pt-4" onSubmit={handleResetPassword}>
                <Input
                  label="Reset Token"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  placeholder="Paste reset token"
                  required
                />
                <Input
                  label="New Password (min 10 chars)"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                />
                <Button type="submit" className="w-full" disabled={submitting}>
                  Reset Password
                </Button>
              </form>
              <button
                type="button"
                onClick={() => {
                  setResetMode(false);
                  setError(null);
                }}
                className="text-xs font-medium text-[#475569] hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
