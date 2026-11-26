import React from 'react';
import { Badge, Button, Card } from '@servicegrid/ui';
import { Sidebar } from '../../../components/layout/Sidebar';
import { TopNav } from '../../../components/layout/TopNav';

export default function AutomationPage() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar activeItem="Automation" />
      <div className="flex flex-1 flex-col">
        <TopNav title="Workflow Automation" />
        <main className="flex-1 space-y-6 p-6">
          <Card
            title="Loop-Safe Workflow Builder"
            subtitle="Automate dispatcher alerts, invoice drafts, AMC renewal reminders, and low-stock alerts"
            action={<Button size="sm">New Workflow</Button>}
          >
            <div className="space-y-3 text-sm text-[#475569]">
              <div className="flex items-center justify-between rounded-md border border-[#E2E8F0] p-3">
                <span>When a request is received → Notify Dispatcher</span>
                <Badge tone="teal">Trigger + Notification</Badge>
              </div>
              <div className="flex items-center justify-between rounded-md border border-[#E2E8F0] p-3">
                <span>When a job is completed → Create Invoice Draft</span>
                <Badge tone="teal">Trigger + Billing</Badge>
              </div>
              <div className="flex items-center justify-between rounded-md border border-[#E2E8F0] p-3">
                <span>When stock reaches threshold → Alert Inventory Manager</span>
                <Badge tone="teal">Condition + Alert</Badge>
              </div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
