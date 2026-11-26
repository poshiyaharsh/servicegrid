export type SyncOperationStatus = 'PENDING' | 'IN_FLIGHT' | 'SYNCED' | 'CONFLICT' | 'FAILED';

export interface OutboxOperation<TPayload = Record<string, unknown>> {
  operationId: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'STATUS_CHANGE' | 'ATTACHMENT_UPLOAD';
  payload: TPayload;
  clientVersion: number;
  createdAtIso: string;
  attempts: number;
  status: SyncOperationStatus;
  lastError?: string;
}

export function computeBackoffMs(attempts: number, baseMs = 1500, maxMs = 60_000): number {
  const exp = Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, attempts)));
  return Math.round(exp);
}
