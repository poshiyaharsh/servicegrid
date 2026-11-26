import React from 'react';
import { Badge, Button, Card, Table } from '@servicegrid/ui';
import { Sidebar } from '../../../components/layout/Sidebar';
import { TopNav } from '../../../components/layout/TopNav';

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  customer: string;
  grandTotal: string;
  balanceDue: string;
  status: string;
}

const SAMPLE_INVOICES: InvoiceRow[] = [];

export default function FinancePage() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar activeItem="Finance" />
      <div className="flex flex-1 flex-col">
        <TopNav title="Billing &amp; Financial Operations" />
        <main className="flex-1 space-y-6 p-6">
          <Card
            title="Invoices &amp; Receivables"
            subtitle="GST (CGST/SGST/IGST), multi-currency billing, credit/debit notes, and UPI/payment reconciliation"
            action={<Button size="sm">New Estimate</Button>}
          >
            <Table
              columns={[
                { key: 'num', header: 'Invoice #', render: (r) => r.invoiceNumber },
                { key: 'cust', header: 'Customer', render: (r) => r.customer },
                { key: 'total', header: 'Total', align: 'right', render: (r) => `₹${r.grandTotal}` },
                { key: 'bal', header: 'Balance Due', align: 'right', render: (r) => `₹${r.balanceDue}` },
                { key: 'status', header: 'Status', render: (r) => <Badge tone="teal">{r.status}</Badge> },
              ]}
              data={SAMPLE_INVOICES}
              keyExtractor={(r) => r.id}
              emptyMessage="No invoices generated yet."
            />
          </Card>
        </main>
      </div>
    </div>
  );
}
