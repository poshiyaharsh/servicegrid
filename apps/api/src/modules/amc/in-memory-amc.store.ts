import crypto from 'node:crypto';
import type { AmcContractRecord, AmcStore, ScheduledVisitRecord } from './amc.store';

export class InMemoryAmcStore implements AmcStore {
  private contracts = new Map<string, AmcContractRecord>();
  private visits = new Map<string, ScheduledVisitRecord>();

  async listContracts(tenantId: string) {
    return [...this.contracts.values()].filter((c) => c.tenantId === tenantId);
  }

  async findContractById(tenantId: string, id: string) {
    const c = this.contracts.get(id);
    return c && c.tenantId === tenantId ? c : null;
  }

  async createContractWithVisits(
    contractInput: Omit<AmcContractRecord, 'id'>,
    visitsInput: Array<{ visitKey: string; scheduledDate: Date }>,
  ) {
    const contract: AmcContractRecord = { id: crypto.randomUUID(), ...contractInput };
    this.contracts.set(contract.id, contract);

    const visits: ScheduledVisitRecord[] = visitsInput.map((v) => {
      const rec: ScheduledVisitRecord = {
        id: crypto.randomUUID(),
        tenantId: contract.tenantId,
        contractId: contract.id,
        visitKey: v.visitKey,
        scheduledDate: v.scheduledDate,
        workOrderId: null,
        status: 'PENDING',
      };
      this.visits.set(rec.id, rec);
      return rec;
    });

    return { contract, visits };
  }

  async listVisits(tenantId: string, contractId: string) {
    return [...this.visits.values()].filter(
      (v) => v.tenantId === tenantId && v.contractId === contractId,
    );
  }

  async markVisitGenerated(tenantId: string, visitId: string, workOrderId: string) {
    const v = this.visits.get(visitId);
    if (!v || v.tenantId !== tenantId) return null;
    const updated: ScheduledVisitRecord = { ...v, status: 'GENERATED', workOrderId };
    this.visits.set(visitId, updated);
    return updated;
  }

  async updateContractStatus(
    tenantId: string,
    contractId: string,
    status: AmcContractRecord['status'],
    cancellationReason?: string | null,
  ) {
    const c = await this.findContractById(tenantId, contractId);
    if (!c) return null;
    const updated: AmcContractRecord = {
      ...c,
      status,
      ...(cancellationReason !== undefined ? { cancellationReason } : {}),
    };
    this.contracts.set(contractId, updated);
    return updated;
  }

  async skipPendingVisits(tenantId: string, contractId: string) {
    for (const [id, v] of this.visits.entries()) {
      if (v.tenantId === tenantId && v.contractId === contractId && v.status === 'PENDING') {
        this.visits.set(id, { ...v, status: 'SKIPPED' });
      }
    }
  }
}
