import React from 'react';
import { Badge, Button, Card, Table } from '@servicegrid/ui';
import { Sidebar } from '../../../components/layout/Sidebar';
import { TopNav } from '../../../components/layout/TopNav';

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitPrice: string;
}

const SAMPLE_PRODUCTS: ProductRow[] = [];

export default function InventoryPage() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar activeItem="Inventory" />
      <div className="flex flex-1 flex-col">
        <TopNav title="Inventory &amp; Warehouses" />
        <main className="flex-1 space-y-6 p-6">
          <Card
            title="Spare Parts &amp; Products"
            subtitle="SKU, barcode, QR tracking, main warehouses, technician vehicle stock, and auditable movement ledger"
            action={<Button size="sm">Add Product</Button>}
          >
            <Table
              columns={[
                { key: 'sku', header: 'SKU', render: (r) => r.sku },
                { key: 'name', header: 'Product', render: (r) => r.name },
                { key: 'category', header: 'Category', render: (r) => <Badge>{r.category}</Badge> },
                { key: 'price', header: 'Unit Price', align: 'right', render: (r) => `₹${r.unitPrice}` },
              ]}
              data={SAMPLE_PRODUCTS}
              keyExtractor={(r) => r.id}
              emptyMessage="No products in inventory yet."
            />
          </Card>
        </main>
      </div>
    </div>
  );
}
