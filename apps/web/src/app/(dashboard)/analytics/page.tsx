import React from 'react';
import { Badge, Card } from '@servicegrid/ui';
import { Sidebar } from '../../../components/layout/Sidebar';
import { TopNav } from '../../../components/layout/TopNav';

export default function AnalyticsPage() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar activeItem="Analytics" />
      <div className="flex flex-1 flex-col">
        <TopNav title="Analytics &amp; AI Intelligence" />
        <main className="flex-1 space-y-6 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Total Jobs', '0'],
              ['First-Time Fix Rate', '100%'],
              ['Outstanding Receivables', '₹0.00'],
              ['AMC Renewals Due (30d)', '0'],
            ].map(([label, val]) => (
              <Card key={label} title={label}>
                <p className="text-2xl font-bold tabular-nums text-[#0F172A]">{val}</p>
              </Card>
            ))}
          </div>
          <Card
            title="AI Operations Assistant"
            subtitle="Complaint classification, voice-to-request drafts, spare part suggestions, and anomaly alerts"
            action={<Badge tone="teal">Human Approval Required</Badge>}
          >
            <p className="text-sm text-[#64748B]">
              AI suggestions require human confirmation and never autonomously finalize invoices, payments, taxes, or job completion.
            </p>
          </Card>
        </main>
      </div>
    </div>
  );
}
