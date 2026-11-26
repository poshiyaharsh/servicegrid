import type { ApiClient } from '@servicegrid/api-client';
import type { OutboxOperation } from '@servicegrid/offline-sync';
import type { WorkOrderStatus } from '@servicegrid/types';
import type {
  LocalAsset,
  LocalChecklist,
  LocalCustomer,
  LocalJob,
  LocalJobHistory,
  QueuedAttachment,
  SyncTransport,
} from '../offline/offline-sync-engine';

interface HydratedAssignedJobResponse {
  id: string;
  tenantId: string;
  customerId: string;
  jobNumber: string;
  title: string;
  description: string | null;
  status: WorkOrderStatus;
  priority: string;
  version: number;
  technicianNotes: string | null;
  scheduledStartAt: string | null;
  customer: {
    id: string;
    displayName: string;
    primaryPhone: string;
    addressSummary: string | null;
  } | null;
  asset: {
    id: string;
    category: string;
    brand: string | null;
    model: string | null;
    serialNumber: string | null;
  } | null;
  checklists: Array<{
    id: string;
    title: string;
    items: Array<{ label: string; completed: boolean }>;
  }>;
  statusHistory: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    reason: string | null;
    changedAt: string;
  }>;
}

export class ApiSyncTransport implements SyncTransport {
  constructor(private readonly api: ApiClient) {}

  async fetchAssignedBundle(): Promise<{
    jobs: LocalJob[];
    customers: LocalCustomer[];
    assets: LocalAsset[];
    checklists: LocalChecklist[];
    history: LocalJobHistory[];
  }> {
    const res = await this.api.request<HydratedAssignedJobResponse[]>('/sync/assigned-jobs');
    const jobs: LocalJob[] = [];
    const customersMap = new Map<string, LocalCustomer>();
    const assetsMap = new Map<string, LocalAsset>();
    const checklists: LocalChecklist[] = [];
    const history: LocalJobHistory[] = [];

    for (const item of res.data) {
      jobs.push({
        id: item.id,
        tenantId: item.tenantId,
        customerId: item.customerId,
        assetId: item.asset?.id,
        jobNumber: item.jobNumber,
        title: item.title,
        description: item.description ?? undefined,
        status: item.status,
        priority: item.priority,
        scheduledStartAt: item.scheduledStartAt ?? undefined,
        version: item.version,
        technicianNotes: item.technicianNotes ?? undefined,
      });

      if (item.customer) {
        customersMap.set(item.customer.id, {
          id: item.customer.id,
          tenantId: item.tenantId,
          displayName: item.customer.displayName,
          primaryPhone: item.customer.primaryPhone,
          addressSummary: item.customer.addressSummary ?? undefined,
        });
      }

      if (item.asset) {
        assetsMap.set(item.asset.id, {
          id: item.asset.id,
          tenantId: item.tenantId,
          customerId: item.customerId,
          category: item.asset.category,
          brand: item.asset.brand ?? undefined,
          model: item.asset.model ?? undefined,
          serialNumber: item.asset.serialNumber ?? undefined,
        });
      }

      for (const cl of item.checklists ?? []) {
        checklists.push({
          id: cl.id,
          tenantId: item.tenantId,
          workOrderId: item.id,
          title: cl.title,
          items: cl.items.map((i, idx) => ({
            id: `${cl.id}_${idx}`,
            label: i.label,
            type: 'CHECKBOX',
            completed: i.completed,
            required: false,
          })),
        });
      }

      for (const h of item.statusHistory ?? []) {
        history.push({
          id: h.id,
          tenantId: item.tenantId,
          workOrderId: item.id,
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          reason: h.reason ?? undefined,
          changedAt: h.changedAt,
        });
      }
    }

    return {
      jobs,
      customers: [...customersMap.values()],
      assets: [...assetsMap.values()],
      checklists,
      history,
    };
  }

  async pushOperation(op: OutboxOperation): Promise<{
    status: 'APPLIED' | 'DUPLICATE_IGNORED' | 'CONFLICT';
    serverVersion?: number;
    serverStatus?: WorkOrderStatus;
    message?: string;
  }> {
    const res = await this.api.request<
      Array<{
        operationId: string;
        status: 'APPLIED' | 'DUPLICATE_IGNORED' | 'CONFLICT' | 'NOT_FOUND' | 'FORBIDDEN';
        serverVersion?: number;
        serverStatus?: WorkOrderStatus;
        message?: string;
      }>
    >('/sync/operations', {
      method: 'POST',
      body: JSON.stringify({
        operations: [
          {
            operationId: op.operationId,
            entityType: op.entityType,
            entityId: op.entityId,
            action: op.action,
            payload: op.payload,
            clientVersion: op.clientVersion,
            deviceId: op.deviceId,
            sequenceNumber: op.sequenceNumber,
          },
        ],
      }),
    });

    const outcome = res.data[0];
    if (!outcome) {
      return { status: 'CONFLICT', message: 'Empty sync response from server' };
    }
    if (outcome.status === 'NOT_FOUND' || outcome.status === 'FORBIDDEN') {
      return {
        status: 'CONFLICT',
        message: outcome.message ?? `Server rejected operation (${outcome.status})`,
      };
    }
    return {
      status: outcome.status,
      serverVersion: outcome.serverVersion,
      serverStatus: outcome.serverStatus,
      message: outcome.message,
    };
  }

  async uploadAttachment(att: QueuedAttachment): Promise<{ storageKey: string }> {
    const res = await this.api.request<{ status: string; storageKey: string }>('/sync/attachments', {
      method: 'POST',
      body: JSON.stringify({
        attachmentId: att.id,
        workOrderId: att.workOrderId,
        category: att.category,
        fileName: att.fileName,
        mimeType: att.mimeType,
        sizeBytes: att.sizeBytes,
        checksum: att.checksum,
        fileUrl: att.localUri,
      }),
    });
    return { storageKey: res.data.storageKey };
  }
}
