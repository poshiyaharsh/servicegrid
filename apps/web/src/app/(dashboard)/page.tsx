import React from 'react';
import { Card } from '@servicegrid/ui';
import { Sidebar } from '../../components/layout/Sidebar';
import { TopNav } from '../../components/layout/TopNav';
import { LoadingSkeleton } from '../../components/branding/LoadingSkeleton';

export default function DashboardOverviewPage() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar activeItem="Overview" />
      <div className="flex flex-1 flex-col">
        <TopNav title="Operations Overview" />
        <main className="flex-1 space-y-6 p-6">
          <LoadingSkeleton variant="kpi" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Today's Appointments" subtitle="Scheduled technician visits">
              <p className="text-sm text-[#64748B]">
                Connect API data in Phase 06–08 to display live scheduled appointments.
              </p>
            </Card>
            <Card title="Outstanding Invoices" subtitle="Pending receivables">
              <p className="text-sm text-[#64748B]">
                Connect billing module in Phase 10 to display GST &amp; multi-currency receivables.
              </p>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
