import React from 'react';
import { Badge, Button, Card, Input, Table } from '@servicegrid/ui';
import { Sidebar } from '../../../components/layout/Sidebar';
import { TopNav } from '../../../components/layout/TopNav';

interface CustomerRow {
  id: string;
  displayName: string;
  customerType: 'INDIVIDUAL' | 'BUSINESS';
  primaryPhone: string;
  city: string;
}

const SAMPLE_CUSTOMERS: CustomerRow[] = [];

export default function CustomersPage() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar activeItem="Customers" />
      <div className="flex flex-1 flex-col">
        <TopNav title="Customers &amp; Assets" />
        <main className="flex-1 space-y-6 p-6">
          <Card
            title="Customer Directory"
            subtitle="Manage residential &amp; commercial accounts, contacts, addresses, and equipment assets"
            action={<Button size="sm">Add Customer</Button>}
          >
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="w-full max-w-sm">
                <Input placeholder="Search by name, phone, email, or GSTIN…" />
              </div>
              <Button variant="secondary" size="sm">
                Import CSV
              </Button>
              <Button variant="secondary" size="sm">
                Export CSV
              </Button>
            </div>
            <Table
              columns={[
                { key: 'name', header: 'Customer', render: (r) => r.displayName },
                {
                  key: 'type',
                  header: 'Type',
                  render: (r) => (
                    <Badge tone={r.customerType === 'BUSINESS' ? 'teal' : 'neutral'}>
                      {r.customerType}
                    </Badge>
                  ),
                },
                { key: 'phone', header: 'Phone', render: (r) => r.primaryPhone },
                { key: 'city', header: 'City', render: (r) => r.city },
              ]}
              data={SAMPLE_CUSTOMERS}
              keyExtractor={(r) => r.id}
              emptyMessage="No customers yet. Add your first customer or import from CSV."
            />
          </Card>
        </main>
      </div>
    </div>
  );
}
