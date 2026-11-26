import React from 'react';
import { Badge, Button, Card } from '@servicegrid/ui';
import { Sidebar } from '../../../components/layout/Sidebar';
import { TopNav } from '../../../components/layout/TopNav';

export default function DispatchBoardPage() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar activeItem="Dispatch" />
      <div className="flex flex-1 flex-col">
        <TopNav title="Scheduling &amp; Dispatch Board" />
        <main className="flex-1 space-y-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button size="sm">Daily</Button>
              <Button size="sm" variant="secondary">Weekly</Button>
              <Button size="sm" variant="secondary">Monthly</Button>
            </div>
            <Badge tone="teal">Skill &amp; Availability Guard Active</Badge>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card title="Dispatcher Calendar" subtitle="Drag-and-drop technician assignment" className="lg:col-span-2">
              <p className="text-sm text-[#64748B]">
                Technician timelines and appointment slots appear here once technicians are registered.
              </p>
            </Card>
            <Card title="Route Optimization &amp; Map" subtitle="Travel time &amp; stop ordering">
              <p className="text-sm text-[#64748B]">
                Select a technician to preview optimized job sequence and estimated travel time.
              </p>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
