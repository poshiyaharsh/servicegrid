export type VisitFrequency = 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';

export interface AmcContractRecord {
  id: string;
  tenantId: string;
  customerId: string;
  contractNumber: string;
  title: string;
  price: string;
  currency: string;
  startDate: Date;
  endDate: Date;
  visitFrequency: VisitFrequency;
  coverageDetails: Record<string, unknown>;
  coveredAssetIds: string[];
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'RENEWED';
  cancellationReason: string | null;
  renewedFromId: string | null;
}

export interface ScheduledVisitRecord {
  id: string;
  tenantId: string;
  contractId: string;
  visitKey: string;
  scheduledDate: Date;
  workOrderId: string | null;
  status: 'PENDING' | 'GENERATED' | 'COMPLETED' | 'SKIPPED';
}

export const AMC_STORE = Symbol('AMC_STORE');

export interface AmcStore {
  listContracts(tenantId: string): Promise<AmcContractRecord[]>;
  findContractById(tenantId: string, id: string): Promise<AmcContractRecord | null>;
  createContractWithVisits(
    contract: Omit<AmcContractRecord, 'id'>,
    visits: Array<{ visitKey: string; scheduledDate: Date }>,
  ): Promise<{ contract: AmcContractRecord; visits: ScheduledVisitRecord[] }>;
  listVisits(tenantId: string, contractId: string): Promise<ScheduledVisitRecord[]>;
  markVisitGenerated(
    tenantId: string,
    visitId: string,
    workOrderId: string,
  ): Promise<ScheduledVisitRecord | null>;
  updateContractStatus(
    tenantId: string,
    contractId: string,
    status: AmcContractRecord['status'],
    cancellationReason?: string | null,
  ): Promise<AmcContractRecord | null>;
  skipPendingVisits(tenantId: string, contractId: string): Promise<void>;
}
