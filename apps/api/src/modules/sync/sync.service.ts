import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { withTenantTransaction } from '@servicegrid/database';
import type { SystemRole, WorkOrderStatus } from '@servicegrid/types';
import { validateUploadMetadata } from '../../common/security/file-upload.validator';
import { CRM_STORE, type CrmStore } from '../crm/crm.store';
import { assertValidTransition } from '../work-orders/work-order-state-machine';
import {
  WORK_ORDERS_STORE,
  type AttachmentCategory,
  type ChecklistItem,
  type WorkOrdersStore,
} from '../work-orders/work-orders.store';

export type SyncActionType =
  | 'STATUS_CHANGE'
  | 'UPDATE_NOTES'
  | 'CHECKLIST_UPDATE'
  | 'PARTS_CONSUMED'
  | 'ATTACHMENT_UPLOAD'
  | 'SIGNATURE_CAPTURE'
  | 'LOCATION_EVENT';

export interface IncomingSyncOperation {
  operationId: string;
  entityType: 'WORK_ORDER';
  entityId: string;
  action: SyncActionType;
  payload: Record<string, unknown>;
  clientVersion: number;
  deviceId?: string;
  sequenceNumber?: number;
}

export interface IncomingAttachmentUpload {
  attachmentId: string;
  workOrderId: string;
  category: AttachmentCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum?: string;
  fileUrl?: string;
}

export interface SyncOperationOutcome {
  operationId: string;
  status: 'APPLIED' | 'DUPLICATE_IGNORED' | 'CONFLICT' | 'NOT_FOUND' | 'FORBIDDEN';
  serverVersion?: number;
  serverStatus?: WorkOrderStatus;
  message?: string;
}

export const SYNC_LOG_STORE = Symbol('SYNC_LOG_STORE');

export interface SyncLogStore {
  hasOperation(tenantId: string, operationId: string): Promise<boolean>;
  recordOperation(input: {
    tenantId: string;
    operationId: string;
    userId: string;
    entityType: string;
    entityId: string;
    action: string;
    clientVersion: number;
    status: string;
  }): Promise<void>;
}

@Injectable()
export class PrismaSyncLogStore implements SyncLogStore {
  async hasOperation(tenantId: string, operationId: string): Promise<boolean> {
    return withTenantTransaction(tenantId, async (tx) => {
      const existing = await tx.syncOperation.findFirst({ where: { tenantId, operationId } });
      return Boolean(existing);
    });
  }

  async recordOperation(input: {
    tenantId: string;
    operationId: string;
    userId: string;
    entityType: string;
    entityId: string;
    action: string;
    clientVersion: number;
    status: string;
  }): Promise<void> {
    await withTenantTransaction(input.tenantId, (tx) =>
      tx.syncOperation.create({ data: input }),
    );
  }
}

export class InMemorySyncLogStore implements SyncLogStore {
  private seen = new Set<string>();

  async hasOperation(tenantId: string, operationId: string): Promise<boolean> {
    return this.seen.has(`${tenantId}:${operationId}`);
  }

  async recordOperation(input: { tenantId: string; operationId: string }): Promise<void> {
    this.seen.add(`${input.tenantId}:${input.operationId}`);
  }
}

const SUPERVISOR_ROLES: readonly SystemRole[] = [
  'ORGANIZATION_OWNER',
  'ORGANIZATION_ADMIN',
  'OPERATIONS_MANAGER',
  'DISPATCHER',
];

@Injectable()
export class SyncService {
  constructor(
    @Inject(WORK_ORDERS_STORE) private readonly workOrdersStore: WorkOrdersStore,
    @Inject(SYNC_LOG_STORE) private readonly syncLogStore: SyncLogStore,
    @Optional() @Inject(CRM_STORE) private readonly crmStore?: CrmStore,
  ) {}

  async getAssignedJobs(tenantId: string, userId?: string, roles?: readonly SystemRole[]) {
    const workOrders = await this.workOrdersStore.listWorkOrders(tenantId);
    const isSupervisor = Boolean(roles?.some((r) => SUPERVISOR_ROLES.includes(r)));
    const hydrated: Array<Record<string, unknown>> = [];

    for (const wo of workOrders) {
      const details = await this.workOrdersStore.getWorkOrderDetails(tenantId, wo.id);
      if (!details) continue;

      if (userId && !isSupervisor) {
        const assignedToMe = details.assignments.some((a) => a.technicianUserId === userId);
        if (!assignedToMe) continue;
      }

      const customerProfile = this.crmStore
        ? await this.crmStore.getCustomerProfile(tenantId, wo.customerId)
        : null;
      const defaultAddr =
        customerProfile?.addresses.find((a) => a.isPrimary) ?? customerProfile?.addresses[0];
      const asset = wo.assetId
        ? customerProfile?.assets.find((a) => a.id === wo.assetId) ?? null
        : null;

      hydrated.push({
        ...wo,
        customer: customerProfile
          ? {
              id: customerProfile.customer.id,
              displayName: customerProfile.customer.displayName,
              primaryPhone: customerProfile.customer.primaryPhone,
              addressSummary: defaultAddr
                ? `${defaultAddr.line1}, ${defaultAddr.city}, ${defaultAddr.state} ${defaultAddr.postalCode}`
                : null,
            }
          : null,
        asset: asset
          ? {
              id: asset.id,
              category: asset.category,
              brand: asset.manufacturer,
              model: asset.modelName,
              serialNumber: asset.serialNumber,
            }
          : null,
        assignments: details.assignments,
        visits: details.visits,
        checklists: details.checklists,
        statusHistory: details.statusHistory,
      });
    }

    return hydrated;
  }

  async processBatch(
    tenantId: string,
    userId: string,
    operations: IncomingSyncOperation[],
    roles?: readonly SystemRole[],
  ): Promise<SyncOperationOutcome[]> {
    const outcomes: SyncOperationOutcome[] = [];
    const isSupervisor = Boolean(roles?.some((r) => SUPERVISOR_ROLES.includes(r)));

    for (const op of operations) {
      const alreadyProcessed = await this.syncLogStore.hasOperation(tenantId, op.operationId);
      if (alreadyProcessed) {
        outcomes.push({
          operationId: op.operationId,
          status: 'DUPLICATE_IGNORED',
          message: 'Operation already processed idempotently',
        });
        continue;
      }

      const details = await this.workOrdersStore.getWorkOrderDetails(tenantId, op.entityId);
      if (!details) {
        outcomes.push({ operationId: op.operationId, status: 'NOT_FOUND' });
        continue;
      }

      if (
        roles &&
        !isSupervisor &&
        details.assignments.length > 0 &&
        !details.assignments.some((a) => a.technicianUserId === userId)
      ) {
        outcomes.push({
          operationId: op.operationId,
          status: 'FORBIDDEN',
          message: 'Technician is not assigned to this work order',
        });
        continue;
      }

      const currentVersion = details.workOrder.version;
      if (op.clientVersion < currentVersion) {
        await this.syncLogStore.recordOperation({
          tenantId,
          operationId: op.operationId,
          userId,
          entityType: op.entityType,
          entityId: op.entityId,
          action: op.action,
          clientVersion: op.clientVersion,
          status: 'CONFLICT',
        });
        outcomes.push({
          operationId: op.operationId,
          status: 'CONFLICT',
          serverVersion: currentVersion,
          serverStatus: details.workOrder.status,
          message: `Version conflict: client v${op.clientVersion} < server v${currentVersion}`,
        });
        continue;
      }

      if (op.action === 'STATUS_CHANGE') {
        const nextStatus = op.payload.status as WorkOrderStatus;
        try {
          assertValidTransition(details.workOrder.status, nextStatus);
        } catch (err) {
          outcomes.push({
            operationId: op.operationId,
            status: 'CONFLICT',
            serverVersion: currentVersion,
            serverStatus: details.workOrder.status,
            message: err instanceof Error ? err.message : 'Invalid status transition',
          });
          continue;
        }

        const updated = await this.workOrdersStore.updateWorkOrderStatus({
          tenantId,
          workOrderId: op.entityId,
          fromStatus: details.workOrder.status,
          toStatus: nextStatus,
          actorUserId: userId,
          reason:
            typeof op.payload.reason === 'string' ? op.payload.reason : 'Offline mobile sync',
          technicianNotes:
            typeof op.payload.technicianNotes === 'string' ? op.payload.technicianNotes : undefined,
        });
        await this.syncLogStore.recordOperation({
          tenantId,
          operationId: op.operationId,
          userId,
          entityType: op.entityType,
          entityId: op.entityId,
          action: op.action,
          clientVersion: op.clientVersion,
          status: 'APPLIED',
        });
        outcomes.push({
          operationId: op.operationId,
          status: 'APPLIED',
          serverVersion: updated?.version ?? currentVersion + 1,
          serverStatus: updated?.status ?? nextStatus,
        });
        continue;
      }

      if (op.action === 'UPDATE_NOTES' || op.action === 'PARTS_CONSUMED' || op.action === 'LOCATION_EVENT') {
        const noteParts = [
          details.workOrder.technicianNotes,
          typeof op.payload.technicianNotes === 'string' ? op.payload.technicianNotes : null,
          typeof op.payload.diagnosis === 'string' ? `Diagnosis: ${op.payload.diagnosis}` : null,
          typeof op.payload.repairPerformed === 'string' ? `Repair: ${op.payload.repairPerformed}` : null,
          typeof op.payload.completionNotes === 'string' ? `Completion: ${op.payload.completionNotes}` : null,
          op.action === 'PARTS_CONSUMED' ? `Parts: ${JSON.stringify(op.payload.parts ?? [])}` : null,
          op.action === 'LOCATION_EVENT'
            ? `Location(${String(op.payload.event ?? 'JOB_EVENT')}): ${String(op.payload.lat ?? '')},${String(op.payload.lng ?? '')}`
            : null,
        ].filter(Boolean);

        const updated = await this.workOrdersStore.updateWorkOrderStatus({
          tenantId,
          workOrderId: op.entityId,
          fromStatus: details.workOrder.status,
          toStatus: details.workOrder.status,
          actorUserId: userId,
          reason: `Offline ${op.action.toLowerCase()}`,
          technicianNotes: noteParts.join('\n'),
        });
        await this.syncLogStore.recordOperation({
          tenantId,
          operationId: op.operationId,
          userId,
          entityType: op.entityType,
          entityId: op.entityId,
          action: op.action,
          clientVersion: op.clientVersion,
          status: 'APPLIED',
        });
        outcomes.push({
          operationId: op.operationId,
          status: 'APPLIED',
          serverVersion: updated?.version ?? currentVersion + 1,
          serverStatus: details.workOrder.status,
        });
        continue;
      }

      if (op.action === 'CHECKLIST_UPDATE') {
        const checklistId = typeof op.payload.checklistId === 'string' ? op.payload.checklistId : '';
        const items = Array.isArray(op.payload.items) ? (op.payload.items as ChecklistItem[]) : [];
        const existingChecklist = details.checklists.find((c) => c.id === checklistId);
        if (existingChecklist) {
          await this.workOrdersStore.updateChecklist(tenantId, op.entityId, checklistId, items);
        } else {
          await this.workOrdersStore.createChecklist(tenantId, op.entityId, {
            title: typeof op.payload.title === 'string' ? op.payload.title : 'Field Inspection Checklist',
            items,
          });
        }
        await this.syncLogStore.recordOperation({
          tenantId,
          operationId: op.operationId,
          userId,
          entityType: op.entityType,
          entityId: op.entityId,
          action: op.action,
          clientVersion: op.clientVersion,
          status: 'APPLIED',
        });
        outcomes.push({
          operationId: op.operationId,
          status: 'APPLIED',
          serverVersion: currentVersion,
          serverStatus: details.workOrder.status,
        });
        continue;
      }

      if (op.action === 'ATTACHMENT_UPLOAD' || op.action === 'SIGNATURE_CAPTURE') {
        const category = (op.payload.category as AttachmentCategory) ??
          (op.action === 'SIGNATURE_CAPTURE' ? 'SIGNATURE' : 'BEFORE_PHOTO');
        const fileName = String(op.payload.fileName ?? `${op.operationId}.jpg`);
        const mimeType = String(op.payload.mimeType ?? 'image/jpeg');
        const sizeBytes = Number(op.payload.sizeBytes ?? 1024);
        validateUploadMetadata({ fileName, mimeType, sizeBytes });

        await this.workOrdersStore.addAttachment({
          tenantId,
          entityType: 'WORK_ORDER',
          entityId: op.entityId,
          category,
          storageKey: String(op.payload.fileUrl ?? `${tenantId}/${op.entityId}/${fileName}`),
          fileName,
          mimeType,
          uploadedByUserId: userId,
        });

        await this.syncLogStore.recordOperation({
          tenantId,
          operationId: op.operationId,
          userId,
          entityType: op.entityType,
          entityId: op.entityId,
          action: op.action,
          clientVersion: op.clientVersion,
          status: 'APPLIED',
        });
        outcomes.push({
          operationId: op.operationId,
          status: 'APPLIED',
          serverVersion: currentVersion,
          serverStatus: details.workOrder.status,
        });
      }
    }

    return outcomes;
  }

  async registerAttachment(
    tenantId: string,
    userId: string,
    input: IncomingAttachmentUpload,
  ) {
    const details = await this.workOrdersStore.getWorkOrderDetails(tenantId, input.workOrderId);
    if (!details) {
      throw new NotFoundException('Work order not found');
    }

    const opKey = `att:${input.checksum || input.attachmentId}`;
    const alreadyUploaded = await this.syncLogStore.hasOperation(tenantId, opKey);
    if (alreadyUploaded) {
      return {
        status: 'DUPLICATE_IGNORED' as const,
        storageKey: `${tenantId}/${input.workOrderId}/${input.attachmentId}`,
      };
    }

    const safeFile = validateUploadMetadata({
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });
    if (!safeFile.sanitizedFileName) {
      throw new BadRequestException('Invalid attachment filename');
    }

    const storageKey = `${tenantId}/${input.workOrderId}/${input.attachmentId}-${safeFile.sanitizedFileName}`;
    await this.workOrdersStore.addAttachment({
      tenantId,
      entityType: 'WORK_ORDER',
      entityId: input.workOrderId,
      category: input.category,
      storageKey: input.fileUrl ?? storageKey,
      fileName: safeFile.sanitizedFileName,
      mimeType: input.mimeType,
      uploadedByUserId: userId,
    });

    await this.syncLogStore.recordOperation({
      tenantId,
      operationId: opKey,
      userId,
      entityType: 'ATTACHMENT',
      entityId: input.workOrderId,
      action: 'ATTACHMENT_UPLOAD',
      clientVersion: details.workOrder.version,
      status: 'APPLIED',
    });

    return { status: 'UPLOADED' as const, storageKey };
  }
}
