import React from 'react';
import { Badge, Button, Card } from '@servicegrid/ui';
import { Sidebar } from '../../../../components/layout/Sidebar';
import { TopNav } from '../../../../components/layout/TopNav';

export default function BillingSettingsPage() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar activeItem="Settings" />
      <div className="flex flex-1 flex-col">
        <TopNav title="Subscription &amp; Usage" />
        <main className="flex-1 space-y-6 p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {[
              ['Starter', '₹1,499/mo', 'Up to 5 technicians • 250 jobs/mo'],
              ['Growth', '₹3,999/mo', 'Up to 25 technicians • 1,500 jobs/mo'],
              ['Enterprise', '₹9,999/mo', 'Unlimited technicians • Multi-branch SLA'],
            ].map(([name, price, desc]) => (
              <Card key={name} title={name} subtitle={desc} action={<Badge tone="teal">INR / Global</Badge>}>
                <p className="text-2xl font-bold text-[#0F172A]">{price}</p>
                <Button size="sm" className="mt-4 w-full">Select Plan</Button>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
