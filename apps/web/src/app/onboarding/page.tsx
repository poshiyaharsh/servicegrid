import React from 'react';
import { Button, Card, Input } from '@servicegrid/ui';
import { BrandLogo } from '../../components/branding/BrandLogo';

export default function BusinessOnboardingPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        <div className="flex flex-col items-center text-center">
          <BrandLogo variant="primary" />
          <h1 className="mt-4 text-xl font-bold text-[#0F172A]">
            Set Up Your Field Service Workspace in 15 Minutes
          </h1>
          <p className="mt-1 text-sm text-[#475569]">
            Choose your trade template (AC, RO, CCTV, Solar, Electrical/Plumbing) and start your 14-day trial.
          </p>
        </div>
        <Card>
          <form className="space-y-4">
            <Input label="Business Name" name="businessName" placeholder="CoolAir Services" required />
            <Input label="Primary Trade" name="trade" placeholder="AC &amp; Appliance Repair" required />
            <Input label="City / Branch" name="city" placeholder="Pune" required />
            <Button type="submit" className="w-full">Start 14-Day Free Trial</Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
