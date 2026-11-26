import React from 'react';
import { Badge, Button, Card, Table } from '@servicegrid/ui';
import { Sidebar } from '../../../components/layout/Sidebar';
import { TopNav } from '../../../components/layout/TopNav';

interface WorkOrderRow {
  id: string;
  jobNumber: string;
  title: string;
  priority: string;
  status: string;
}

const SAMPLE_JOBS: WorkOrderRow[] = [];

export default function WorkOrdersPage() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar activeItem="Work Orders" />
      <div className="flex flex-1 flex-col">
        <TopNav title="Work Orders" />
        <main className="flex-1 space-y-6 p-6">
          <Card
            title="Active Work Orders"
            subtitle="Track job statuses, multi-technician assignments, checklists, and service reports"
            action={<Button size="sm">Create Work Order</Button>}
          >
            <Table
              columns={[
                { key: 'jobNumber', header: 'Job #', render: (r) => r.jobNumber },
                { key: 'title', header: 'Title', render: (r) => r.title },
                { key: 'priority', header: 'Priority', render: (r) => <Badge>{r.priority}</Badge> },
                { key: 'status', header: 'Status', render: (r) => <Badge tone="teal">{r.status}</Badge> },
              ]}
              data={SAMPLE_JOBS}
              keyExtractor={(r) => r.id}
              emptyMessage="No work orders yet. Convert a service request or create a work order."
            />
          </Card>
        </main>
      </div>
    </div>
  );
}
