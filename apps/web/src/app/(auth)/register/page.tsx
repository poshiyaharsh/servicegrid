'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Card, Input } from '@servicegrid/ui';
import { BrandLoader } from '../../../components/branding/BrandLoader';
import { BrandLogo } from '../../../components/branding/BrandLogo';
import { getErrorMessage, useAuth } from '../../../lib/auth-context';

export default function RegisterPage() {
  const router = useRouter();
  const { user, register } = useAuth();
  const [organizationName, setOrganizationName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!organizationName.trim() || !fullName.trim() || !email.trim()) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 10) {
      setError('Password must be at least 10 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await register({
        organizationName: organizationName.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });
      router.replace('/');
    } catch (err) {
      setError(getErrorMessage(err, 'Registration failed.'));
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
            Create your FieldSutra organization workspace
          </p>
        </div>
        <Card>
          {error && (
            <div role="alert" className="mb-4 rounded-md border border-[#FECDD3] bg-[#FFF1F2] px-3 py-2 text-xs text-[#BE123C]">
              {error}
            </div>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Company / Organization Name"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="CoolTech HVAC Services"
              required
            />
            <Input
              label="Your Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Aarav Sharma"
              required
            />
            <Input
              label="Work Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="aarav@cooltech.in"
              required
            />
            <Input
              label="Password (min 10 chars)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              required
            />
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <BrandLoader variant="button" label="Creating workspace…" /> : 'Create Workspace'}
            </Button>
            <p className="text-center text-xs text-[#475569]">
              Already have a workspace?{' '}
              <Link href="/login" className="font-medium text-[#0D9488] hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </main>
  );
}
