import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MobileAuthService } from '../src/auth/mobile-auth.service';
import { InMemorySecureStorage } from '../src/auth/secure-storage';
import {
  createLocalDatabaseState,
  OfflineSyncEngine,
  type SyncTransport,
} from '../src/offline/offline-sync-engine';
import { SQLITE_MIGRATIONS } from '../src/offline/sqlite-schema';

describe('Phase 03 — Technician Mobile Auth, Offline-First Engine & Acceptance Scenarios A–N', () => {
  const tenantA = '11111111-1111-4111-8111-111111111111';
  const tenantB = '99999999-9999-4999-8999-999999999999';
  const techId = '44444444-4444-4444-8444-444444444444';

  it('defines indexed tenant-aware SQLite migrations', () => {
    assert.ok(SQLITE_MIGRATIONS.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS local_assets')));
    assert.ok(SQLITE_MIGRATIONS.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS local_checklists')));
    assert.ok(SQLITE_MIGRATIONS.some((sql) => sql.includes('idx_local_attachment_dedup')));
  });

  it('supports login, session restoration with 401 refresh, and logout data wipe (Scenarios A, N)', async () => {
    const storage = new InMemorySecureStorage();
    let meCalls = 0;

    const mockFetch: typeof fetch = async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/v1/auth/login')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              user: { id: techId, tenantId: tenantA, email: 'tech@co.in', fullName: 'Vikram', isActive: true, emailVerifiedAt: null, roles: ['TECHNICIAN'] },
              accessToken: 'acc-1',
              refreshToken: 'ref-1',
            },
          }),
          { status: 200 },
        );
      }
      if (url.endsWith('/api/v1/auth/me')) {
        meCalls++;
        if (meCalls === 2) {
          return new Response(JSON.stringify({ success: false, error: { code: '401', message: 'Expired' } }), { status: 401 });
        }
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              user: { id: techId, tenantId: tenantA, email: 'tech@co.in', fullName: 'Vikram', isActive: true, emailVerifiedAt: null, roles: ['TECHNICIAN'] },
              tenant: { id: tenantA, name: 'CoolTech', currency: 'INR', timezone: 'Asia/Kolkata' },
            },
          }),
          { status: 200 },
        );
      }
      if (url.endsWith('/api/v1/auth/refresh')) {
        return new Response(
          JSON.stringify({ success: true, data: { accessToken: 'acc-2', refreshToken: 'ref-2' } }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ success: true, data: { revoked: true } }), { status: 200 });
    };

    const auth = new MobileAuthService('http://localhost:4000', storage, undefined, mockFetch);
    const session = await auth.login('tech@co.in', 'StrongPassword123!');
    assert.equal(session.user.fullName, 'Vikram');
    assert.equal(await storage.getItem('fs_mobile_access_token'), 'acc-1');

    const restored = await auth.restoreSession();
    assert.ok(restored);
    assert.equal(await storage.getItem('fs_mobile_access_token'), 'acc-2');

    const db = createLocalDatabaseState();
    const engine = new OfflineSyncEngine(db, { userId: techId, deviceId: session.deviceId });
    engine.downloadAssignedJobs(
      [{ id: 'wo-1', tenantId: tenantA, customerId: 'c-1', jobNumber: 'JOB-1', title: 'AC Service', status: 'ASSIGNED', priority: 'HIGH', version: 1 }],
      [{ id: 'c-1', tenantId: tenantA, displayName: 'Acme', primaryPhone: '+91999' }],
    );

    await auth.logout(() => engine.wipeAllOnLogout());
    assert.equal(await storage.getItem('fs_mobile_access_token'), null);
    assert.equal(await storage.getItem('fs_mobile_refresh_token'), null);
    assert.equal(engine.getJobs().length, 0);
  });

  it('completes full offline-to-online job lifecycle, deduplication, and conflict resolution (Scenarios B–M)', async () => {
    const db = createLocalDatabaseState();
    const engine = new OfflineSyncEngine(db, { userId: techId, deviceId: 'dev-1' });

    // Download job offline
    engine.downloadAssignedJobs(
      [{ id: 'wo-1', tenantId: tenantA, customerId: 'c-1', assetId: 'a-1', jobNumber: 'JOB-101', title: 'Split AC Repair', status: 'ASSIGNED', priority: 'HIGH', version: 1 }],
      [{ id: 'c-1', tenantId: tenantA, displayName: 'Apex Clinic', primaryPhone: '+919876543210', addressSummary: '12 MG Road, Mumbai' }],
      [{ id: 'a-1', tenantId: tenantA, customerId: 'c-1', category: 'AC', brand: 'Daikin', model: 'FTKF50', serialNumber: 'SN-99' }],
    );

    // Offline actions (airplane mode)
    engine.queueJobStatusUpdate({ workOrderId: 'wo-1', tenantId: tenantA, nextStatus: 'IN_PROGRESS' });
    engine.queueJobNotesUpdate({
      workOrderId: 'wo-1',
      tenantId: tenantA,
      diagnosis: 'Low refrigerant pressure',
      repairPerformed: 'Sealed flare joint and topped up R32',
      completionNotes: 'Cooling verified at 14C',
    });
    engine.queuePartsConsumed({
      workOrderId: 'wo-1',
      tenantId: tenantA,
      parts: [{ sku: 'R32-GAS', name: 'R32 Refrigerant', quantity: 1 }],
    });

    const checklist = engine.instantiateChecklistTemplate(tenantA, 'wo-1', 'AC_REPAIR');
    // Required checklist validation blocks completion until filled
    assert.throws(
      () => engine.queueJobStatusUpdate({ workOrderId: 'wo-1', tenantId: tenantA, nextStatus: 'COMPLETED' }),
      /Required checklist items incomplete/,
    );

    checklist.items[0]!.completed = true;
    checklist.items[1]!.value = '115';
    engine.queueChecklistUpdate({
      workOrderId: 'wo-1',
      tenantId: tenantA,
      checklistId: checklist.id,
      title: checklist.title,
      items: checklist.items,
    });

    // Photos + duplicate prevention + signature + authorized location
    const p1 = engine.queueAttachment({
      tenantId: tenantA,
      workOrderId: 'wo-1',
      category: 'BEFORE_PHOTO',
      localUri: 'file:///before.jpg',
      mimeType: 'image/jpeg',
      checksum: 'sha256-before',
    });
    const p1Dup = engine.queueAttachment({
      tenantId: tenantA,
      workOrderId: 'wo-1',
      category: 'BEFORE_PHOTO',
      localUri: 'file:///before.jpg',
      mimeType: 'image/jpeg',
      checksum: 'sha256-before',
    });
    assert.equal(p1.id, p1Dup.id);

    engine.queueSignature({
      tenantId: tenantA,
      workOrderId: 'wo-1',
      localUri: 'file:///sig.png',
      signerName: 'Dr. Mehta',
    });
    engine.queueLocationEvent({
      workOrderId: 'wo-1',
      tenantId: tenantA,
      authorized: true,
      event: 'JOB_COMPLETED',
      lat: 19.076,
      lng: 72.877,
    });
    engine.queueJobStatusUpdate({ workOrderId: 'wo-1', tenantId: tenantA, nextStatus: 'COMPLETED' });

    // Cross-tenant isolation check
    assert.throws(
      () => engine.queueJobStatusUpdate({ workOrderId: 'wo-1', tenantId: tenantB, nextStatus: 'ON_HOLD' }),
      /not found/,
    );

    // Offline sync attempt queues everything safely without discarding
    const seenOps = new Set<string>();
    const seenAtts = new Set<string>();
    let serverVersion = 1;
    let failFirst = true;

    const transport: SyncTransport = {
      async pushOperation(op) {
        if (failFirst) {
          failFirst = false;
          throw new Error('Network dropped');
        }
        if (seenOps.has(op.operationId)) return { status: 'DUPLICATE_IGNORED' };
        seenOps.add(op.operationId);
        if (op.action === 'STATUS_CHANGE' || op.action === 'UPDATE_NOTES') {
          serverVersion++;
        }
        return { status: 'APPLIED', serverVersion };
      },
      async uploadAttachment(att) {
        seenAtts.add(att.id);
        return { storageKey: `s3://${att.id}` };
      },
    };

    const offlineRes = await engine.syncNow(transport, false);
    assert.equal(offlineRes.synced, 0);
    assert.ok(engine.getSyncSummary().pendingCount >= 7);

    // First online sync encounters transient network failure on first op -> FAILED with backoff
    const partialRes = await engine.syncNow(transport, true);
    assert.equal(partialRes.failed, 1);

    // Retry & complete sync
    engine.retryFailedOperations();
    const onlineRes = await engine.syncNow(transport, true);
    assert.equal(onlineRes.failed, 0);
    assert.equal(engine.getSyncSummary().pendingCount, 0);
    assert.ok(engine.getSyncSummary().lastSyncedAt);

    // Repeating sync does not duplicate operations or attachments
    const repeatRes = await engine.syncNow(transport, true);
    assert.equal(repeatRes.synced, 0);
    assert.equal(seenAtts.size, 2); // 1 photo + 1 signature

    // Conflict scenario (Scenario M): server version advanced externally
    const conflictOp = engine.queueJobNotesUpdate({
      workOrderId: 'wo-1',
      tenantId: tenantA,
      completionNotes: 'Follow-up note',
    });
    const conflictTransport: SyncTransport = {
      async pushOperation() {
        return { status: 'CONFLICT', serverVersion: 99, serverStatus: 'COMPLETED', message: 'Stale version' };
      },
      async uploadAttachment() {
        return { storageKey: 'x' };
      },
    };
    const conflictRes = await engine.syncNow(conflictTransport, true);
    assert.equal(conflictRes.conflicts, 1);
    assert.equal(engine.getSyncSummary().conflictCount, 1);

    engine.resolveConflict(conflictOp.operationId, 'ACCEPT_SERVER', 99, 'COMPLETED');
    assert.equal(engine.getSyncSummary().conflictCount, 0);
    assert.equal(engine.getJobs()[0]?.version, 99);
  });
});
