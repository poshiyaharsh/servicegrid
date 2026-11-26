import React from 'react';
import { Button, Card, Input } from '@servicegrid/ui';
import { BrandLogo } from '../../../components/branding/BrandLogo';

export default function LoginPage() {
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
          <form className="space-y-4">
            <Input label="Work Email" name="email" type="email" placeholder="ops@company.in" required />
            <Input label="Password" name="password" type="password" placeholder="••••••••" required />
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
