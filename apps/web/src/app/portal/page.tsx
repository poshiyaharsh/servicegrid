import React from 'react';
import { Badge, Card } from '@servicegrid/ui';
import { BrandLogo } from '../../components/branding/BrandLogo';

export default function CustomerPortalPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-[#E2E8F0] bg-white px-6 py-3.5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <BrandLogo variant="light" />
          <Badge tone="teal">Customer Self-Service Portal</Badge>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <Card title="Your Service Requests &amp; AMC Coverage" subtitle="Track appointments, approve estimates, and download GST invoices">
          <p className="text-sm text-[#64748B]">
            Sign in with your registered phone or email to view active work orders and warranties.
          </p>
        </Card>
      </main>
    </div>
  );
}
