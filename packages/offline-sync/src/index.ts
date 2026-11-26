export type SyncOperationStatus =
  | 'PENDING'
  | 'UPLOADING'
  | 'IN_FLIGHT'
  | 'SYNCED'
  | 'CONFLICT'
  | 'FAILED';

export type OutboxActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'STATUS_CHANGE'
  | 'UPDATE_NOTES'
  | 'CHECKLIST_UPDATE'
  | 'PARTS_CONSUMED'
  | 'ATTACHMENT_UPLOAD'
  | 'SIGNATURE_CAPTURE'
  | 'LOCATION_EVENT';

export interface OutboxOperation<TPayload = Record<string, unknown>> {
  operationId: string;
  tenantId: string;
  userId?: string;
  deviceId?: string;
  sequenceNumber?: number;
  entityType: string;
  entityId: string;
  action: OutboxActionType;
  payload: TPayload;
  clientVersion: number;
  createdAtIso: string;
  attempts: number;
  nextRetryAtIso?: string;
  status: SyncOperationStatus;
  lastError?: string;
  serverVersion?: number;
}

export function computeBackoffMs(attempts: number, baseMs = 1500, maxMs = 60_000): number {
  const exp = Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, attempts)));
  return Math.round(exp);
}
