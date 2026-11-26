import { Inject, Injectable } from '@nestjs/common';
import { prisma, withTenantTransaction } from '@servicegrid/database';
import type { WorkOrderStatus } from '@servicegrid/types';
import { assertValidTransition } from '../work-orders/work-order-state-machine';
import { WORK_ORDERS_STORE, type WorkOrdersStore } from '../work-orders/work-orders.store';

export interface IncomingSyncOperation {
  operationId: string;
  entityType: 'WORK_ORDER';
  entityId: string;
  action: 'STATUS_CHANGE' | 'UPDATE_NOTES' | 'ATTACHMENT_UPLOAD';
  payload: Record<string, unknown>;
  clientVersion: number;
}

export interface SyncOperationOutcome {
  operationId: string;
  status: 'APPLIED' | 'DUPLICATE_IGNORED' | 'CONFLICT' | 'NOT_FOUND';
  serverVersion?: number;
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

@Injectable()
export class SyncService {
  constructor(
    @Inject(WORK_ORDERS_STORE) private readonly workOrdersStore: WorkOrdersStore,
    @Inject(SYNC_LOG_STORE) private readonly syncLogStore: SyncLogStore,
  ) {}

  async getAssignedJobs(tenantId: string) {
    return this.workOrdersStore.listWorkOrders(tenantId);
  }

  async processBatch(
    tenantId: string,
    userId: string,
    operations: IncomingSyncOperation[],
  ): Promise<SyncOperationOutcome[]> {
    const outcomes: SyncOperationOutcome[] = [];

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
          message: `Version conflict: client v${op.clientVersion} < server v${currentVersion}`,
        });
        continue;
      }

      if (op.action === 'STATUS_CHANGE') {
        const nextStatus = op.payload.status as WorkOrderStatus;
        assertValidTransition(details.workOrder.status, nextStatus);
        const updated = await this.workOrdersStore.updateWorkOrderStatus({
          tenantId,
          workOrderId: op.entityId,
          fromStatus: details.workOrder.status,
          toStatus: nextStatus,
          actorUserId: userId,
          reason: 'Offline mobile sync',
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
        });
      } else {
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
        });
      }
    }

    return outcomes;
  }
}

void prisma;
