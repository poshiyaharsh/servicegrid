import { computeBackoffMs, type OutboxOperation } from '@servicegrid/offline-sync';
import type { WorkOrderStatus } from '@servicegrid/types';

export interface LocalCustomer {
  id: string;
  tenantId: string;
  displayName: string;
  primaryPhone: string;
  addressSummary?: string;
}

export interface LocalJob {
  id: string;
  tenantId: string;
  customerId: string;
  jobNumber: string;
  title: string;
  status: WorkOrderStatus;
  priority: string;
  version: number;
  technicianNotes?: string;
}

export interface QueuedAttachment {
  id: string;
  tenantId: string;
  workOrderId: string;
  category: 'BEFORE_PHOTO' | 'AFTER_PHOTO' | 'VOICE_NOTE' | 'SIGNATURE';
  localUri: string;
  mimeType: string;
  status: 'PENDING' | 'UPLOADED' | 'FAILED';
  attempts: number;
}

export interface SyncTransport {
  pushOperation(op: OutboxOperation): Promise<{
    status: 'APPLIED' | 'DUPLICATE_IGNORED' | 'CONFLICT';
    serverVersion?: number;
    message?: string;
  }>;
  uploadAttachment(att: QueuedAttachment): Promise<{ storageKey: string }>;
}

export interface LocalDatabaseState {
  customers: Map<string, LocalCustomer>;
  jobs: Map<string, LocalJob>;
  outbox: Map<string, OutboxOperation>;
  attachments: Map<string, QueuedAttachment>;
  lastSyncedAt: string | null;
}

export function createLocalDatabaseState(): LocalDatabaseState {
  return {
    customers: new Map(),
    jobs: new Map(),
    outbox: new Map(),
    attachments: new Map(),
    lastSyncedAt: null,
  };
}

function generateOperationId(): string {
  return `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export class OfflineSyncEngine {
  constructor(private readonly db: LocalDatabaseState) {}

  /**
   * Recover any IN_FLIGHT operations left behind after an unexpected app restart.
   */
  recoverAfterRestart(): number {
    let recovered = 0;
    for (const op of this.db.outbox.values()) {
      if (op.status === 'IN_FLIGHT') {
        op.status = 'PENDING';
        recovered++;
      }
    }
    return recovered;
  }

  downloadAssignedJobs(jobs: LocalJob[], customers: LocalCustomer[]): void {
    for (const c of customers) {
      this.db.customers.set(c.id, { ...c });
    }
    for (const j of jobs) {
      this.db.jobs.set(j.id, { ...j });
    }
  }

  getJobs(): LocalJob[] {
    return [...this.db.jobs.values()];
  }

  getCustomer(customerId: string): LocalCustomer | undefined {
    return this.db.customers.get(customerId);
  }

  queueJobStatusUpdate(input: {
    workOrderId: string;
    tenantId: string;
    nextStatus: WorkOrderStatus;
    technicianNotes?: string;
  }): OutboxOperation {
    const job = this.db.jobs.get(input.workOrderId);
    if (!job || job.tenantId !== input.tenantId) {
      throw new Error('Job not found in local SQLite cache');
    }

    const op: OutboxOperation = {
      operationId: generateOperationId(),
      tenantId: input.tenantId,
      entityType: 'WORK_ORDER',
      entityId: input.workOrderId,
      action: 'STATUS_CHANGE',
      payload: {
        status: input.nextStatus,
        ...(input.technicianNotes ? { technicianNotes: input.technicianNotes } : {}),
      },
      clientVersion: job.version,
      createdAtIso: new Date().toISOString(),
      attempts: 0,
      status: 'PENDING',
    };

    this.db.jobs.set(job.id, {
      ...job,
      status: input.nextStatus,
      technicianNotes: input.technicianNotes ?? job.technicianNotes,
    });
    this.db.outbox.set(op.operationId, op);
    return op;
  }

  queueAttachment(input: {
    tenantId: string;
    workOrderId: string;
    category: QueuedAttachment['category'];
    localUri: string;
    mimeType: string;
  }): QueuedAttachment {
    const att: QueuedAttachment = {
      id: `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      tenantId: input.tenantId,
      workOrderId: input.workOrderId,
      category: input.category,
      localUri: input.localUri,
      mimeType: input.mimeType,
      status: 'PENDING',
      attempts: 0,
    };
    this.db.attachments.set(att.id, att);
    return att;
  }

  async syncNow(transport: SyncTransport, isOnline: boolean): Promise<{
    synced: number;
    conflicts: number;
    failed: number;
    nextRetryBackoffMs: number | null;
  }> {
    if (!isOnline) {
      return { synced: 0, conflicts: 0, failed: 0, nextRetryBackoffMs: null };
    }

    let synced = 0;
    let conflicts = 0;
    let failed = 0;
    let maxBackoff: number | null = null;

    for (const op of this.db.outbox.values()) {
      if (op.status !== 'PENDING' && op.status !== 'FAILED') continue;

      op.status = 'IN_FLIGHT';
      try {
        const res = await transport.pushOperation(op);
        if (res.status === 'APPLIED' || res.status === 'DUPLICATE_IGNORED') {
          op.status = 'SYNCED';
          if (res.serverVersion !== undefined) {
            const job = this.db.jobs.get(op.entityId);
            if (job) job.version = res.serverVersion;
          }
          synced++;
        } else if (res.status === 'CONFLICT') {
          op.status = 'CONFLICT';
          op.lastError = res.message ?? 'Version conflict detected';
          conflicts++;
        }
      } catch (err) {
        op.attempts += 1;
        op.status = 'FAILED';
        op.lastError = err instanceof Error ? err.message : String(err);
        failed++;
        const backoff = computeBackoffMs(op.attempts);
        maxBackoff = maxBackoff === null ? backoff : Math.max(maxBackoff, backoff);
      }
    }

    for (const att of this.db.attachments.values()) {
      if (att.status !== 'PENDING' && att.status !== 'FAILED') continue;
      try {
        await transport.uploadAttachment(att);
        att.status = 'UPLOADED';
      } catch {
        att.attempts += 1;
        att.status = 'FAILED';
        failed++;
      }
    }

    if (failed === 0) {
      this.db.lastSyncedAt = new Date().toISOString();
    }

    return { synced, conflicts, failed, nextRetryBackoffMs: maxBackoff };
  }

  getSyncStatus() {
    const ops = [...this.db.outbox.values()];
    const atts = [...this.db.attachments.values()];
    return {
      pendingCount: ops.filter((o) => o.status === 'PENDING' || o.status === 'IN_FLIGHT').length,
      failedCount: ops.filter((o) => o.status === 'FAILED').length,
      conflictCount: ops.filter((o) => o.status === 'CONFLICT').length,
      syncedCount: ops.filter((o) => o.status === 'SYNCED').length,
      queuedAttachmentsCount: atts.filter((a) => a.status !== 'UPLOADED').length,
      lastSyncedAt: this.db.lastSyncedAt,
    };
  }
}
