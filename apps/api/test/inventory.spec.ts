import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InMemoryInventoryStore } from '../src/modules/inventory/in-memory-inventory.store';
import { InventoryService } from '../src/modules/inventory/inventory.service';

describe('Phase 09 — Inventory, Vehicle Stock & Auditable Ledger', () => {
  it('maintains auditable movement ledger across PO receipt, transfers, consumption, and alerts', async () => {
    const store = new InMemoryInventoryStore();
    const inv = new InventoryService(store);

    const tenantA = '11111111-1111-4111-8111-111111111111';
    const tenantB = '99999999-9999-4999-8999-999999999999';
    const userA = '22222222-2222-4222-8222-222222222222';

    const product = await inv.createProduct(tenantA, {
      sku: 'CAP-35MF',
      barcode: '8901234567890',
      qrCode: 'QR-CAP-35MF',
      name: '35uF Dual Run Capacitor',
      category: 'HVAC Spares',
      unitPrice: '450.00',
      reorderThreshold: 3,
    });

    const mainWh = await inv.createWarehouse(tenantA, {
      name: 'Pune Central Store',
      code: 'MAIN-PNQ',
      warehouseType: 'MAIN',
    });

    const vanWh = await inv.createWarehouse(tenantA, {
      name: 'Vikram Service Van',
      code: 'VAN-01',
      warehouseType: 'VEHICLE',
      assignedTechnicianId: 'tech-1',
    });

    // Supplier + PO + Receipt
    const supplier = await inv.createSupplier(tenantA, {
      name: 'CoolSpares Distributors',
      phone: '+919820001122',
      gstin: '27AABCC1234D1Z5',
    });

    const po = await inv.createPurchaseOrder(tenantA, {
      supplierId: supplier.id,
      warehouseId: mainWh.id,
      items: [{ productId: product.id, quantity: 10, unitCost: '300.00' }],
      totalAmount: '3000.00',
    });

    const receivedPo = await inv.receivePurchaseOrder(tenantA, po.id, userA);
    assert.equal(receivedPo?.status, 'RECEIVED');
    assert.equal(await store.getStockBalance(tenantA, mainWh.id, product.id), 10);

    // Transfer 4 units to technician vehicle
    await inv.transferStock(tenantA, userA, {
      fromWarehouseId: mainWh.id,
      toWarehouseId: vanWh.id,
      productId: product.id,
      quantity: 4,
    });
    assert.equal(await store.getStockBalance(tenantA, mainWh.id, product.id), 6);
    assert.equal(await store.getStockBalance(tenantA, vanWh.id, product.id), 4);

    // Consume 2 units on a work order
    await inv.consumePartsForJob(tenantA, userA, {
      workOrderId: 'wo-1',
      warehouseId: vanWh.id,
      productId: product.id,
      quantity: 2,
    });
    assert.equal(await store.getStockBalance(tenantA, vanWh.id, product.id), 2);

    // Reject consuming more than available
    await assert.rejects(
      () =>
        inv.consumePartsForJob(tenantA, userA, {
          workOrderId: 'wo-2',
          warehouseId: vanWh.id,
          productId: product.id,
          quantity: 5,
        }),
      BadRequestException,
    );

    // Verify auditable movement ledger matches net balance (10 - 4 + 4 - 2 = 8 total across warehouses)
    const movements = await inv.listMovements(tenantA, product.id);
    assert.equal(movements.length, 4);
    const netLedgerDelta = movements.reduce((sum, m) => sum + m.quantityDelta, 0);
    assert.equal(netLedgerDelta, 8);

    // Adjust down by 6 in mainWh -> total = 2 <= threshold 3 -> triggers low-stock alert
    await inv.adjustStock(tenantA, userA, {
      warehouseId: mainWh.id,
      productId: product.id,
      quantityDelta: -6,
      reason: 'Damaged batch write-off',
    });
    const alerts = await inv.getLowStockAlerts(tenantA);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0]?.totalQuantity, 2);

    // Cross-tenant isolation
    await assert.rejects(() => inv.receivePurchaseOrder(tenantB, po.id, userA), NotFoundException);
  });
});
