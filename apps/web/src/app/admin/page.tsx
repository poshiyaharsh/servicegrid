import React from 'react';
import { Badge, Card } from '@servicegrid/ui';
import { BrandLogo } from '../../components/branding/BrandLogo';

export default function SuperAdminPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-[#E2E8F0] bg-[#0F172A] px-6 py-3.5 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <BrandLogo variant="dark" />
          <Badge tone="teal">Platform Super Admin</Badge>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[
            ['Active Tenants', '0'],
            ['Trialing', '0'],
            ['Grace Period', '0'],
            ['Cancelled', '0'],
          ].map(([label, val]) => (
            <Card key={label} title={label}>
              <p className="text-2xl font-bold tabular-nums text-[#0F172A]">{val}</p>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
