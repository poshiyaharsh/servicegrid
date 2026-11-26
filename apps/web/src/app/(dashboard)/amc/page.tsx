import React from 'react';
import { Badge, Button, Card, Table } from '@servicegrid/ui';
import { Sidebar } from '../../../components/layout/Sidebar';
import { TopNav } from '../../../components/layout/TopNav';

interface AmcRow {
  id: string;
  contractNumber: string;
  title: string;
  frequency: string;
  price: string;
  status: string;
}

const SAMPLE_AMC: AmcRow[] = [];

export default function AmcPage() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar activeItem="AMC" />
      <div className="flex flex-1 flex-col">
        <TopNav title="AMC &amp; Preventive Maintenance" />
        <main className="flex-1 space-y-6 p-6">
          <Card
            title="Annual Maintenance Contracts"
            subtitle="Equipment coverage, preventive schedules, idempotent visit generation, and renewal alerts"
            action={<Button size="sm">Create AMC</Button>}
          >
            <Table
              columns={[
                { key: 'num', header: 'Contract #', render: (r) => r.contractNumber },
                { key: 'title', header: 'Title', render: (r) => r.title },
                { key: 'freq', header: 'Frequency', render: (r) => r.frequency },
                { key: 'price', header: 'Price', align: 'right', render: (r) => `₹${r.price}` },
                { key: 'status', header: 'Status', render: (r) => <Badge tone="teal">{r.status}</Badge> },
              ]}
              data={SAMPLE_AMC}
              keyExtractor={(r) => r.id}
              emptyMessage="No AMC contracts created yet."
            />
          </Card>
        </main>
      </div>
    </div>
  );
}
