import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { InMemorySyncLogStore, SyncService } from '../src/modules/sync/sync.service';
import { InMemoryWorkOrdersStore } from '../src/modules/work-orders/in-memory-work-orders.store';

describe('Phase 07 — Idempotent Mobile Sync API', () => {
  it('applies valid operations, ignores duplicates, detects conflicts, and isolates tenants', async () => {
    const woStore = new InMemoryWorkOrdersStore();
    const syncLog = new InMemorySyncLogStore();
    const syncService = new SyncService(woStore, syncLog);

    const tenantA = '11111111-1111-4111-8111-111111111111';
    const tenantB = '99999999-9999-4999-8999-999999999999';
    const techId = '44444444-4444-4444-8444-444444444444';

    const wo = await woStore.createWorkOrder({
      tenantId: tenantA,
      customerId: '33333333-3333-4333-8333-333333333333',
      jobNumber: 'JOB-SYNC-1',
      title: 'RO Filter Replacement',
      priority: 'MEDIUM',
    });

    // 1. Valid operation (NEW -> ASSIGNED)
    const first = await syncService.processBatch(tenantA, techId, [
      {
        operationId: 'op-100',
        entityType: 'WORK_ORDER',
        entityId: wo.id,
        action: 'STATUS_CHANGE',
        payload: { status: 'ASSIGNED' },
        clientVersion: 1,
      },
    ]);
    assert.equal(first[0]?.status, 'APPLIED');
    assert.equal(first[0]?.serverVersion, 2);

    // 2. Duplicate operationId is ignored idempotently
    const dup = await syncService.processBatch(tenantA, techId, [
      {
        operationId: 'op-100',
        entityType: 'WORK_ORDER',
        entityId: wo.id,
        action: 'STATUS_CHANGE',
        payload: { status: 'ASSIGNED' },
        clientVersion: 1,
      },
    ]);
    assert.equal(dup[0]?.status, 'DUPLICATE_IGNORED');

    // 3. Stale clientVersion (1 < server 2) triggers CONFLICT
    const conflict = await syncService.processBatch(tenantA, techId, [
      {
        operationId: 'op-101',
        entityType: 'WORK_ORDER',
        entityId: wo.id,
        action: 'STATUS_CHANGE',
        payload: { status: 'IN_PROGRESS' },
        clientVersion: 1,
      },
    ]);
    assert.equal(conflict[0]?.status, 'CONFLICT');
    assert.equal(conflict[0]?.serverVersion, 2);

    // 4. Cross-tenant sync attempt returns NOT_FOUND
    const crossTenant = await syncService.processBatch(tenantB, techId, [
      {
        operationId: 'op-102',
        entityType: 'WORK_ORDER',
        entityId: wo.id,
        action: 'STATUS_CHANGE',
        payload: { status: 'IN_PROGRESS' },
        clientVersion: 2,
      },
    ]);
    assert.equal(crossTenant[0]?.status, 'NOT_FOUND');
  });
});
