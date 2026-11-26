import { computeBackoffMs, type OutboxOperation } from '@servicegrid/offline-sync';
import type { WorkOrderStatus } from '@servicegrid/types';

export interface LocalCustomer {
  id: string;
  tenantId: string;
  displayName: string;
  primaryPhone: string;
  addressSummary?: string;
}

export interface LocalAsset {
  id: string;
  tenantId: string;
  customerId: string;
  category: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
}

export interface LocalChecklistItem {
  id: string;
  label: string;
  type: 'CHECKBOX' | 'TEXT' | 'NUMERIC';
  completed: boolean;
  value?: string;
  required?: boolean;
  photoUri?: string;
}

export interface LocalChecklist {
  id: string;
  tenantId: string;
  workOrderId: string;
  title: string;
  items: LocalChecklistItem[];
}

export interface LocalJobHistory {
  id: string;
  tenantId: string;
  workOrderId: string;
  fromStatus: string | null;
  toStatus: string;
  reason?: string;
  changedAt: string;
}

export interface LocalJob {
  id: string;
  tenantId: string;
  customerId: string;
  assetId?: string;
  jobNumber: string;
  title: string;
  description?: string;
  status: WorkOrderStatus;
  priority: string;
  scheduledStartAt?: string;
  version: number;
  technicianNotes?: string;
  diagnosis?: string;
  repairPerformed?: string;
  completionNotes?: string;
}

export interface QueuedAttachment {
  id: string;
  tenantId: string;
  workOrderId: string;
  category: 'BEFORE_PHOTO' | 'AFTER_PHOTO' | 'VOICE_NOTE' | 'SIGNATURE';
  fileName: string;
  localUri: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  compressed: boolean;
  progressPct: number;
  status: 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'FAILED';
  attempts: number;
  capturedAtIso: string;
}

export interface SyncHistoryEntry {
  id: string;
  tenantId: string;
  summary: string;
  syncedCount: number;
  conflictCount: number;
  failedCount: number;
  createdAtIso: string;
}

export interface SyncTransport {
  pushOperation(op: OutboxOperation): Promise<{
    status: 'APPLIED' | 'DUPLICATE_IGNORED' | 'CONFLICT';
    serverVersion?: number;
    serverStatus?: WorkOrderStatus;
    message?: string;
  }>;
  uploadAttachment(att: QueuedAttachment): Promise<{ storageKey: string }>;
}

export interface LocalDatabaseState {
  customers: Map<string, LocalCustomer>;
  assets: Map<string, LocalAsset>;
  jobs: Map<string, LocalJob>;
  checklists: Map<string, LocalChecklist>;
  history: Map<string, LocalJobHistory>;
  outbox: Map<string, OutboxOperation>;
  attachments: Map<string, QueuedAttachment>;
  syncHistory: SyncHistoryEntry[];
  lastSyncedAt: string | null;
  sequenceCounter: number;
}

export const CHECKLIST_TEMPLATES: Record<
  'AC_INSTALLATION' | 'AC_REPAIR' | 'REFRIGERATOR_REPAIR' | 'RO_MAINTENANCE',
  { title: string; items: Omit<LocalChecklistItem, 'id'>[] }
> = {
  AC_INSTALLATION: {
    title: 'AC Installation Inspection',
    items: [
      { label: 'Indoor unit level & drain slope verified', type: 'CHECKBOX', completed: false, required: true },
      { label: 'Vacuum pressure reading (microns)', type: 'NUMERIC', completed: false, required: true, value: '' },
      { label: 'Installation remarks', type: 'TEXT', completed: false, required: false, value: '' },
    ],
  },
  AC_REPAIR: {
    title: 'AC Repair Checklist',
    items: [
      { label: 'Airflow & coil cleanliness checked', type: 'CHECKBOX', completed: false, required: true },
      { label: 'Suction pressure (PSI)', type: 'NUMERIC', completed: false, required: true, value: '' },
      { label: 'Fault observation', type: 'TEXT', completed: false, required: false, value: '' },
    ],
  },
  REFRIGERATOR_REPAIR: {
    title: 'Refrigerator Repair Checklist',
    items: [
      { label: 'Compressor & relay tested', type: 'CHECKBOX', completed: false, required: true },
      { label: 'Freezer temperature (°C)', type: 'NUMERIC', completed: false, required: true, value: '' },
    ],
  },
  RO_MAINTENANCE: {
    title: 'RO Maintenance Checklist',
    items: [
      { label: 'Sediment & carbon filters flushed', type: 'CHECKBOX', completed: false, required: true },
      { label: 'Output TDS reading (ppm)', type: 'NUMERIC', completed: false, required: true, value: '' },
    ],
  },
};

export function createLocalDatabaseState(): LocalDatabaseState {
  return {
    customers: new Map(),
    assets: new Map(),
    jobs: new Map(),
    checklists: new Map(),
    history: new Map(),
    outbox: new Map(),
    attachments: new Map(),
    syncHistory: [],
    lastSyncedAt: null,
    sequenceCounter: 0,
  };
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export class OfflineSyncEngine {
  constructor(
    private readonly db: LocalDatabaseState,
    private readonly context: { userId?: string; deviceId?: string } = {},
  ) {}

  recoverAfterRestart(): number {
    let recovered = 0;
    for (const op of this.db.outbox.values()) {
      if (op.status === 'IN_FLIGHT' || op.status === 'UPLOADING') {
        op.status = 'PENDING';
        recovered++;
      }
    }
    for (const att of this.db.attachments.values()) {
      if (att.status === 'UPLOADING') {
        att.status = 'PENDING';
      }
    }
    return recovered;
  }

  downloadAssignedJobs(
    jobs: LocalJob[],
    customers: LocalCustomer[],
    assets: LocalAsset[] = [],
    checklists: LocalChecklist[] = [],
    history: LocalJobHistory[] = [],
  ): void {
    for (const c of customers) this.db.customers.set(c.id, { ...c });
    for (const a of assets) this.db.assets.set(a.id, { ...a });
    for (const j of jobs) this.db.jobs.set(j.id, { ...j });
    for (const cl of checklists) this.db.checklists.set(cl.id, { ...cl, items: [...cl.items] });
    for (const h of history) this.db.history.set(h.id, { ...h });
  }

  getJobs(tenantId?: string): LocalJob[] {
    const all = [...this.db.jobs.values()];
    return tenantId ? all.filter((j) => j.tenantId === tenantId) : all;
  }

  getCustomer(customerId: string): LocalCustomer | undefined {
    return this.db.customers.get(customerId);
  }

  getAsset(assetId?: string): LocalAsset | undefined {
    return assetId ? this.db.assets.get(assetId) : undefined;
  }

  getJobChecklists(workOrderId: string): LocalChecklist[] {
    return [...this.db.checklists.values()].filter((c) => c.workOrderId === workOrderId);
  }

  getJobHistory(workOrderId: string): LocalJobHistory[] {
    return [...this.db.history.values()]
      .filter((h) => h.workOrderId === workOrderId)
      .sort((a, b) => (a.changedAt < b.changedAt ? 1 : -1));
  }

  instantiateChecklistTemplate(
    tenantId: string,
    workOrderId: string,
    templateKey: keyof typeof CHECKLIST_TEMPLATES,
  ): LocalChecklist {
    const tpl = CHECKLIST_TEMPLATES[templateKey];
    const checklist: LocalChecklist = {
      id: generateId('chk'),
      tenantId,
      workOrderId,
      title: tpl.title,
      items: tpl.items.map((item, idx) => ({ ...item, id: `${templateKey}_${idx}` })),
    };
    this.db.checklists.set(checklist.id, checklist);
    return checklist;
  }

  validateChecklistCompletion(workOrderId: string): { valid: boolean; missingLabels: string[] } {
    const checklists = this.getJobChecklists(workOrderId);
    const missingLabels: string[] = [];
    for (const cl of checklists) {
      for (const item of cl.items) {
        if (!item.required) continue;
        if (item.type === 'CHECKBOX' && !item.completed) missingLabels.push(item.label);
        if ((item.type === 'TEXT' || item.type === 'NUMERIC') && !item.value?.trim()) {
          missingLabels.push(item.label);
        }
      }
    }
    return { valid: missingLabels.length === 0, missingLabels };
  }

  private enqueueOperation(
    input: Omit<OutboxOperation, 'operationId' | 'createdAtIso' | 'attempts' | 'status' | 'sequenceNumber'>,
  ): OutboxOperation {
    this.db.sequenceCounter += 1;
    const op: OutboxOperation = {
      operationId: generateId('op'),
      tenantId: input.tenantId,
      userId: input.userId ?? this.context.userId,
      deviceId: input.deviceId ?? this.context.deviceId,
      sequenceNumber: this.db.sequenceCounter,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      payload: input.payload,
      clientVersion: input.clientVersion,
      createdAtIso: new Date().toISOString(),
      attempts: 0,
      status: 'PENDING',
    };
    this.db.outbox.set(op.operationId, op);
    return op;
  }

  queueJobStatusUpdate(input: {
    workOrderId: string;
    tenantId: string;
    nextStatus: WorkOrderStatus;
    technicianNotes?: string;
    reason?: string;
  }): OutboxOperation {
    const job = this.db.jobs.get(input.workOrderId);
    if (!job || job.tenantId !== input.tenantId) {
      throw new Error('Job not found in local SQLite cache');
    }

    if (input.nextStatus === 'COMPLETED') {
      const check = this.validateChecklistCompletion(input.workOrderId);
      if (!check.valid) {
        throw new Error(`Required checklist items incomplete: ${check.missingLabels.join(', ')}`);
      }
    }

    const op = this.enqueueOperation({
      tenantId: input.tenantId,
      entityType: 'WORK_ORDER',
      entityId: input.workOrderId,
      action: 'STATUS_CHANGE',
      payload: {
        status: input.nextStatus,
        ...(input.reason ? { reason: input.reason } : {}),
        ...(input.technicianNotes ? { technicianNotes: input.technicianNotes } : {}),
      },
      clientVersion: job.version,
    });

    const prevStatus = job.status;
    job.status = input.nextStatus;
    if (input.technicianNotes) job.technicianNotes = input.technicianNotes;
    this.db.history.set(generateId('hist'), {
      id: generateId('hist'),
      tenantId: input.tenantId,
      workOrderId: job.id,
      fromStatus: prevStatus,
      toStatus: input.nextStatus,
      reason: input.reason ?? 'Offline update queued',
      changedAt: new Date().toISOString(),
    });
    return op;
  }

  queueJobNotesUpdate(input: {
    workOrderId: string;
    tenantId: string;
    technicianNotes?: string;
    diagnosis?: string;
    repairPerformed?: string;
    completionNotes?: string;
  }): OutboxOperation {
    const job = this.db.jobs.get(input.workOrderId);
    if (!job || job.tenantId !== input.tenantId) {
      throw new Error('Job not found in local SQLite cache');
    }
    if (input.technicianNotes !== undefined) job.technicianNotes = input.technicianNotes;
    if (input.diagnosis !== undefined) job.diagnosis = input.diagnosis;
    if (input.repairPerformed !== undefined) job.repairPerformed = input.repairPerformed;
    if (input.completionNotes !== undefined) job.completionNotes = input.completionNotes;

    return this.enqueueOperation({
      tenantId: input.tenantId,
      entityType: 'WORK_ORDER',
      entityId: input.workOrderId,
      action: 'UPDATE_NOTES',
      payload: {
        ...(input.technicianNotes !== undefined ? { technicianNotes: input.technicianNotes } : {}),
        ...(input.diagnosis !== undefined ? { diagnosis: input.diagnosis } : {}),
        ...(input.repairPerformed !== undefined ? { repairPerformed: input.repairPerformed } : {}),
        ...(input.completionNotes !== undefined ? { completionNotes: input.completionNotes } : {}),
      },
      clientVersion: job.version,
    });
  }

  queuePartsConsumed(input: {
    workOrderId: string;
    tenantId: string;
    parts: Array<{ sku: string; name: string; quantity: number }>;
  }): OutboxOperation {
    const job = this.db.jobs.get(input.workOrderId);
    if (!job || job.tenantId !== input.tenantId) {
      throw new Error('Job not found in local SQLite cache');
    }
    return this.enqueueOperation({
      tenantId: input.tenantId,
      entityType: 'WORK_ORDER',
      entityId: input.workOrderId,
      action: 'PARTS_CONSUMED',
      payload: { parts: input.parts },
      clientVersion: job.version,
    });
  }

  queueChecklistUpdate(input: {
    workOrderId: string;
    tenantId: string;
    checklistId: string;
    title: string;
    items: LocalChecklistItem[];
  }): OutboxOperation {
    const job = this.db.jobs.get(input.workOrderId);
    if (!job || job.tenantId !== input.tenantId) {
      throw new Error('Job not found in local SQLite cache');
    }
    this.db.checklists.set(input.checklistId, {
      id: input.checklistId,
      tenantId: input.tenantId,
      workOrderId: input.workOrderId,
      title: input.title,
      items: input.items,
    });
    return this.enqueueOperation({
      tenantId: input.tenantId,
      entityType: 'WORK_ORDER',
      entityId: input.workOrderId,
      action: 'CHECKLIST_UPDATE',
      payload: {
        checklistId: input.checklistId,
        title: input.title,
        items: input.items.map((i) => ({ label: i.label, completed: i.completed, value: i.value })),
      },
      clientVersion: job.version,
    });
  }

  queueLocationEvent(input: {
    workOrderId: string;
    tenantId: string;
    authorized: boolean;
    event: 'JOB_STARTED' | 'JOB_COMPLETED' | 'ARRIVED';
    lat: number;
    lng: number;
  }): OutboxOperation | null {
    if (!input.authorized) return null;
    const job = this.db.jobs.get(input.workOrderId);
    if (!job || job.tenantId !== input.tenantId) {
      throw new Error('Job not found in local SQLite cache');
    }
    return this.enqueueOperation({
      tenantId: input.tenantId,
      entityType: 'WORK_ORDER',
      entityId: input.workOrderId,
      action: 'LOCATION_EVENT',
      payload: {
        event: input.event,
        lat: input.lat,
        lng: input.lng,
        recordedAtIso: new Date().toISOString(),
      },
      clientVersion: job.version,
    });
  }

  queueAttachment(input: {
    tenantId: string;
    workOrderId: string;
    category: QueuedAttachment['category'];
    localUri: string;
    mimeType: string;
    fileName?: string;
    sizeBytes?: number;
    checksum?: string;
    compressed?: boolean;
  }): QueuedAttachment {
    const job = this.db.jobs.get(input.workOrderId);
    if (!job || job.tenantId !== input.tenantId) {
      throw new Error('Cannot queue attachment for inaccessible or cross-tenant job');
    }

    const checksum = input.checksum ?? `${input.workOrderId}:${input.category}:${input.localUri}`;
    for (const existing of this.db.attachments.values()) {
      if (
        existing.tenantId === input.tenantId &&
        existing.workOrderId === input.workOrderId &&
        existing.checksum === checksum
      ) {
        return existing;
      }
    }

    const att: QueuedAttachment = {
      id: generateId('att'),
      tenantId: input.tenantId,
      workOrderId: input.workOrderId,
      category: input.category,
      fileName: input.fileName ?? `${input.category.toLowerCase()}.jpg`,
      localUri: input.localUri,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes ?? 128_000,
      checksum,
      compressed: input.compressed ?? true,
      progressPct: 0,
      status: 'PENDING',
      attempts: 0,
      capturedAtIso: new Date().toISOString(),
    };
    this.db.attachments.set(att.id, att);
    return att;
  }

  queueSignature(input: {
    tenantId: string;
    workOrderId: string;
    localUri: string;
    signerName: string;
    checksum?: string;
  }): QueuedAttachment {
    const att = this.queueAttachment({
      tenantId: input.tenantId,
      workOrderId: input.workOrderId,
      category: 'SIGNATURE',
      localUri: input.localUri,
      mimeType: 'image/png',
      fileName: `signature-${input.workOrderId}.png`,
      sizeBytes: 24_576,
      checksum: input.checksum ?? `sig:${input.workOrderId}:${input.signerName}`,
      compressed: true,
    });
    const job = this.db.jobs.get(input.workOrderId);
    if (job) {
      this.enqueueOperation({
        tenantId: input.tenantId,
        entityType: 'WORK_ORDER',
        entityId: input.workOrderId,
        action: 'SIGNATURE_CAPTURE',
        payload: {
          signerName: input.signerName,
          capturedAtIso: att.capturedAtIso,
          category: 'SIGNATURE',
          fileName: att.fileName,
          mimeType: att.mimeType,
          sizeBytes: att.sizeBytes,
        },
        clientVersion: job.version,
      });
    }
    return att;
  }

  async syncNow(
    transport: SyncTransport,
    isOnline: boolean,
  ): Promise<{ synced: number; conflicts: number; failed: number; nextRetryBackoffMs: number | null }> {
    if (!isOnline) {
      return { synced: 0, conflicts: 0, failed: 0, nextRetryBackoffMs: null };
    }

    let synced = 0;
    let conflicts = 0;
    let failed = 0;
    let maxBackoffMs: number | null = null;

    const orderedOps = [...this.db.outbox.values()]
      .filter((op) => op.status === 'PENDING' || op.status === 'FAILED')
      .sort((a, b) => (a.sequenceNumber ?? 0) - (b.sequenceNumber ?? 0));

    for (const op of orderedOps) {
      op.status = 'UPLOADING';
      try {
        const res = await transport.pushOperation(op);
        if (res.status === 'APPLIED' || res.status === 'DUPLICATE_IGNORED') {
          op.status = 'SYNCED';
          synced++;
          const job = this.db.jobs.get(op.entityId);
          if (job && res.serverVersion) {
            job.version = res.serverVersion;
          }
        } else {
          op.status = 'CONFLICT';
          op.serverVersion = res.serverVersion;
          op.lastError = res.message ?? 'Version or status conflict detected';
          conflicts++;
        }
      } catch (err) {
        op.attempts++;
        op.status = 'FAILED';
        op.lastError = err instanceof Error ? err.message : 'Network error';
        const backoff = computeBackoffMs(op.attempts);
        op.nextRetryAtIso = new Date(Date.now() + backoff).toISOString();
        maxBackoffMs = maxBackoffMs === null ? backoff : Math.max(maxBackoffMs, backoff);
        failed++;
      }
    }

    for (const att of this.db.attachments.values()) {
      if (att.status !== 'PENDING' && att.status !== 'FAILED') continue;
      att.status = 'UPLOADING';
      att.progressPct = 40;
      try {
        await transport.uploadAttachment(att);
        att.progressPct = 100;
        att.status = 'UPLOADED';
      } catch {
        att.attempts++;
        att.progressPct = 0;
        att.status = 'FAILED';
        failed++;
      }
    }

    if (synced > 0 || conflicts > 0 || failed > 0) {
      const tenantId = orderedOps[0]?.tenantId ?? [...this.db.jobs.values()][0]?.tenantId ?? 'unknown';
      this.db.syncHistory.unshift({
        id: generateId('synchist'),
        tenantId,
        summary: `Synced ${synced}, Conflicts ${conflicts}, Failed ${failed}`,
        syncedCount: synced,
        conflictCount: conflicts,
        failedCount: failed,
        createdAtIso: new Date().toISOString(),
      });
    }

    if (failed === 0 && conflicts === 0) {
      this.db.lastSyncedAt = new Date().toISOString();
    }

    return { synced, conflicts, failed, nextRetryBackoffMs: maxBackoffMs };
  }

  resolveConflict(
    operationId: string,
    resolution: 'ACCEPT_SERVER' | 'RETRY_WITH_SERVER_VERSION',
    serverVersion: number,
    serverStatus?: WorkOrderStatus,
  ): void {
    const op = this.db.outbox.get(operationId);
    if (!op) throw new Error('Operation not found');
    const job = this.db.jobs.get(op.entityId);

    if (resolution === 'ACCEPT_SERVER') {
      op.status = 'SYNCED';
      op.lastError = 'Resolved by accepting server state';
      if (job) {
        job.version = serverVersion;
        if (serverStatus) job.status = serverStatus;
      }
      return;
    }

    if (job) job.version = serverVersion;
    op.clientVersion = serverVersion;
    op.status = 'PENDING';
    op.lastError = undefined;
  }

  retryFailedOperations(): number {
    let count = 0;
    for (const op of this.db.outbox.values()) {
      if (op.status === 'FAILED') {
        op.status = 'PENDING';
        count++;
      }
    }
    for (const att of this.db.attachments.values()) {
      if (att.status === 'FAILED') {
        att.status = 'PENDING';
        count++;
      }
    }
    return count;
  }

  clearTenantData(tenantId: string): void {
    for (const [k, v] of this.db.customers) if (v.tenantId === tenantId) this.db.customers.delete(k);
    for (const [k, v] of this.db.assets) if (v.tenantId === tenantId) this.db.assets.delete(k);
    for (const [k, v] of this.db.jobs) if (v.tenantId === tenantId) this.db.jobs.delete(k);
    for (const [k, v] of this.db.checklists) if (v.tenantId === tenantId) this.db.checklists.delete(k);
    for (const [k, v] of this.db.history) if (v.tenantId === tenantId) this.db.history.delete(k);
    for (const [k, v] of this.db.outbox) if (v.tenantId === tenantId) this.db.outbox.delete(k);
    for (const [k, v] of this.db.attachments) if (v.tenantId === tenantId) this.db.attachments.delete(k);
    this.db.syncHistory = this.db.syncHistory.filter((h) => h.tenantId !== tenantId);
  }

  wipeAllOnLogout(): void {
    this.db.customers.clear();
    this.db.assets.clear();
    this.db.jobs.clear();
    this.db.checklists.clear();
    this.db.history.clear();
    this.db.outbox.clear();
    this.db.attachments.clear();
    this.db.syncHistory = [];
    this.db.lastSyncedAt = null;
    this.db.sequenceCounter = 0;
  }

  pruneSyncedHistory(olderThanDays = 30): number {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    let removed = 0;
    for (const [k, op] of this.db.outbox) {
      if (op.status === 'SYNCED' && Date.parse(op.createdAtIso) < cutoff) {
        this.db.outbox.delete(k);
        removed++;
      }
    }
    return removed;
  }

  getSyncStatus() {
    return this.getSyncSummary();
  }

  getSyncSummary() {
    const ops = [...this.db.outbox.values()];
    const atts = [...this.db.attachments.values()];
    return {
      pendingCount: ops.filter((o) => o.status === 'PENDING' || o.status === 'UPLOADING' || o.status === 'IN_FLIGHT').length,
      failedCount: ops.filter((o) => o.status === 'FAILED').length,
      failedAttachmentsCount: atts.filter((a) => a.status === 'FAILED').length,
      conflictCount: ops.filter((o) => o.status === 'CONFLICT').length,
      syncedCount: ops.filter((o) => o.status === 'SYNCED').length,
      queuedAttachmentsCount: atts.filter((a) => a.status !== 'UPLOADED').length,
      lastSyncedAt: this.db.lastSyncedAt,
      conflicts: ops.filter((o) => o.status === 'CONFLICT'),
      syncHistory: this.db.syncHistory,
    };
  }
}
