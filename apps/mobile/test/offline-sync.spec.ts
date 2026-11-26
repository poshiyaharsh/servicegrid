import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createLocalDatabaseState,
  OfflineSyncEngine,
  type SyncTransport,
} from '../src/offline/offline-sync-engine';

describe('Phase 07 — Mobile Offline-First SQLite Sync Engine', () => {
  const tenantId = '11111111-1111-4111-8111-111111111111';

  it('handles online, offline, interrupted sync, duplicates, conflicts, and app restart recovery', async () => {
    const db = createLocalDatabaseState();
    const engine = new OfflineSyncEngine(db);

    // 1. Download assigned jobs & customer info locally
    engine.downloadAssignedJobs(
      [
        {
          id: 'job-1',
          tenantId,
          customerId: 'cust-1',
          jobNumber: 'JOB-101',
          title: 'AC Gas Refill',
          status: 'ASSIGNED',
          priority: 'HIGH',
          version: 1,
        },
      ],
      [
        {
          id: 'cust-1',
          tenantId,
          displayName: 'Meera Nair',
          primaryPhone: '+919811112222',
          addressSummary: 'Pune',
        },
      ],
    );

    assert.equal(engine.getJobs().length, 1);
    assert.equal(engine.getCustomer('cust-1')?.displayName, 'Meera Nair');

    // 2. Offline operation: update job + queue attachment while offline
    const op1 = engine.queueJobStatusUpdate({
      workOrderId: 'job-1',
      tenantId,
      nextStatus: 'IN_PROGRESS',
      technicianNotes: 'Started compressor check',
    });
    engine.queueAttachment({
      tenantId,
      workOrderId: 'job-1',
      category: 'BEFORE_PHOTO',
      localUri: 'file:///cache/before.jpg',
      mimeType: 'image/jpeg',
    });

    const offlineResult = await engine.syncNow(
      {
        pushOperation: async () => ({ status: 'APPLIED', serverVersion: 2 }),
        uploadAttachment: async () => ({ storageKey: 's3://before.jpg' }),
      },
      false,
    );
    assert.equal(offlineResult.synced, 0);
    assert.equal(engine.getSyncStatus().pendingCount, 1);
    assert.equal(engine.getSyncStatus().queuedAttachmentsCount, 1);

    // 3. Interrupted synchronization: network fails mid-sync -> marked FAILED with backoff
    const failingTransport: SyncTransport = {
      pushOperation: async () => {
        throw new Error('Network timeout');
      },
      uploadAttachment: async () => {
        throw new Error('Network timeout');
      },
    };
    const interrupted = await engine.syncNow(failingTransport, true);
    assert.equal(interrupted.failed, 2);
    assert.ok(interrupted.nextRetryBackoffMs && interrupted.nextRetryBackoffMs > 0);
    assert.equal(engine.getSyncStatus().failedCount, 1);

    // 4. App restart during synchronization: simulate IN_FLIGHT op recovered on startup
    db.outbox.get(op1.operationId)!.status = 'IN_FLIGHT';
    const recovered = engine.recoverAfterRestart();
    assert.equal(recovered, 1);
    assert.equal(db.outbox.get(op1.operationId)!.status, 'PENDING');

    // 5. Online retry + duplicate idempotency: server returns DUPLICATE_IGNORED or APPLIED
    let pushCalls = 0;
    const onlineTransport: SyncTransport = {
      pushOperation: async () => {
        pushCalls++;
        return pushCalls === 1
          ? { status: 'APPLIED', serverVersion: 2 }
          : { status: 'DUPLICATE_IGNORED' };
      },
      uploadAttachment: async () => ({ storageKey: 's3://before.jpg' }),
    };
    const syncedRes = await engine.syncNow(onlineTransport, true);
    assert.equal(syncedRes.synced, 1);
    assert.equal(syncedRes.failed, 0);
    assert.equal(engine.getSyncStatus().pendingCount, 0);
    assert.equal(engine.getSyncStatus().queuedAttachmentsCount, 0);

    // 6. Conflicting update: server reports version conflict
    engine.queueJobStatusUpdate({
      workOrderId: 'job-1',
      tenantId,
      nextStatus: 'COMPLETED',
    });
    const conflictRes = await engine.syncNow(
      {
        pushOperation: async () => ({
          status: 'CONFLICT',
          serverVersion: 5,
          message: 'Server has newer state',
        }),
        uploadAttachment: async () => ({ storageKey: 's3://unused' }),
      },
      true,
    );
    assert.equal(conflictRes.conflicts, 1);
    assert.equal(engine.getSyncStatus().conflictCount, 1);
  });
});
