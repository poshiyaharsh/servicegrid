import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { InMemoryCrmStore } from '../src/modules/crm/in-memory-crm.store';
import { InMemorySyncLogStore, SyncService } from '../src/modules/sync/sync.service';
import { InMemoryWorkOrdersStore } from '../src/modules/work-orders/in-memory-work-orders.store';

describe('Phase 07 & Phase 03 — Idempotent Mobile Sync API', () => {
  it('applies valid operations, ignores duplicates, detects conflicts, and isolates tenants', async () => {
    const woStore = new InMemoryWorkOrdersStore();
    const syncLog = new InMemorySyncLogStore();
    const crmStore = new InMemoryCrmStore();
    const syncService = new SyncService(woStore, syncLog, crmStore);

    const tenantA = '11111111-1111-4111-8111-111111111111';
    const tenantB = '99999999-9999-4999-8999-999999999999';
    const techId = '44444444-4444-4444-8444-444444444444';
    const otherTechId = '55555555-5555-4555-8555-555555555555';

    const customer = await crmStore.createCustomer({
      tenantId: tenantA,
      customerType: 'BUSINESS',
      displayName: 'Apex Diagnostics',
      primaryPhone: '+919876543210',
    });

    const wo = await woStore.createWorkOrder({
      tenantId: tenantA,
      customerId: customer.id,
      jobNumber: 'JOB-SYNC-1',
      title: 'RO Filter Replacement',
      priority: 'MEDIUM',
    });
    await woStore.assignTechnicians(tenantA, wo.id, [{ technicianUserId: techId, isLead: true }]);

    // Hydrated assigned jobs filtered to technician
    const techJobs = await syncService.getAssignedJobs(tenantA, techId, ['TECHNICIAN']);
    assert.equal(techJobs.length, 1);
    assert.equal((techJobs[0]?.customer as { displayName: string }).displayName, 'Apex Diagnostics');

    const otherTechJobs = await syncService.getAssignedJobs(tenantA, otherTechId, ['TECHNICIAN']);
    assert.equal(otherTechJobs.length, 0);

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

    // 4. Unassigned technician is forbidden
    const forbidden = await syncService.processBatch(
      tenantA,
      otherTechId,
      [
        {
          operationId: 'op-unassigned',
          entityType: 'WORK_ORDER',
          entityId: wo.id,
          action: 'UPDATE_NOTES',
          payload: { diagnosis: 'Attempted hijack' },
          clientVersion: 2,
        },
      ],
      ['TECHNICIAN'],
    );
    assert.equal(forbidden[0]?.status, 'FORBIDDEN');

    // 5. Notes, checklist, signature, and attachment deduplication
    const notesAndChecklist = await syncService.processBatch(tenantA, techId, [
      {
        operationId: 'op-notes-1',
        entityType: 'WORK_ORDER',
        entityId: wo.id,
        action: 'UPDATE_NOTES',
        payload: { diagnosis: 'Clogged membrane', repairPerformed: 'Replaced RO membrane' },
        clientVersion: 2,
      },
      {
        operationId: 'op-chk-1',
        entityType: 'WORK_ORDER',
        entityId: wo.id,
        action: 'CHECKLIST_UPDATE',
        payload: { checklistId: 'new', title: 'RO Maintenance', items: [{ label: 'TDS checked', completed: true }] },
        clientVersion: 3,
      },
    ]);
    assert.equal(notesAndChecklist[0]?.status, 'APPLIED');
    assert.equal(notesAndChecklist[1]?.status, 'APPLIED');

    const att1 = await syncService.registerAttachment(tenantA, techId, {
      attachmentId: 'att-1',
      workOrderId: wo.id,
      category: 'BEFORE_PHOTO',
      fileName: 'before.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 2048,
      checksum: 'chk-123',
    });
    assert.equal(att1.status, 'UPLOADED');
    const attDup = await syncService.registerAttachment(tenantA, techId, {
      attachmentId: 'att-1',
      workOrderId: wo.id,
      category: 'BEFORE_PHOTO',
      fileName: 'before.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 2048,
      checksum: 'chk-123',
    });
    assert.equal(attDup.status, 'DUPLICATE_IGNORED');

    // 6. Cross-tenant sync attempt returns NOT_FOUND
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
