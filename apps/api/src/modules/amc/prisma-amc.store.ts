import { Injectable } from '@nestjs/common';
import { withTenantTransaction, type Prisma } from '@servicegrid/database';
import type { AmcContractRecord, AmcStore, ScheduledVisitRecord, VisitFrequency } from './amc.store';

@Injectable()
export class PrismaAmcStore implements AmcStore {
  async listContracts(tenantId: string): Promise<AmcContractRecord[]> {
    const rows = await withTenantTransaction(tenantId, (tx) =>
      tx.amcContract.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),
    );
    return rows.map((c) => this.mapContract(c));
  }

  async findContractById(tenantId: string, id: string): Promise<AmcContractRecord | null> {
    const row = await withTenantTransaction(tenantId, (tx) =>
      tx.amcContract.findFirst({ where: { id, tenantId } }),
    );
    return row ? this.mapContract(row) : null;
  }

  async createContractWithVisits(
    contractInput: Omit<AmcContractRecord, 'id'>,
    visitsInput: Array<{ visitKey: string; scheduledDate: Date }>,
  ): Promise<{ contract: AmcContractRecord; visits: ScheduledVisitRecord[] }> {
    return withTenantTransaction(contractInput.tenantId, async (tx) => {
      const contract = await tx.amcContract.create({
        data: {
          ...contractInput,
          coverageDetails: contractInput.coverageDetails as Prisma.InputJsonValue,
          visits: {
            create: visitsInput.map((v) => ({
              tenantId: contractInput.tenantId,
              visitKey: v.visitKey,
              scheduledDate: v.scheduledDate,
            })),
          },
        },
        include: { visits: true },
      });

      return {
        contract: this.mapContract(contract),
        visits: contract.visits.map((v) => ({
          ...v,
          status: v.status as ScheduledVisitRecord['status'],
        })),
      };
    });
  }

  async listVisits(tenantId: string, contractId: string): Promise<ScheduledVisitRecord[]> {
    const rows = await withTenantTransaction(tenantId, (tx) =>
      tx.scheduledVisit.findMany({
        where: { tenantId, contractId },
        orderBy: { scheduledDate: 'asc' },
      }),
    );
    return rows.map((v) => ({ ...v, status: v.status as ScheduledVisitRecord['status'] }));
  }

  async markVisitGenerated(
    tenantId: string,
    visitId: string,
    workOrderId: string,
  ): Promise<ScheduledVisitRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const existing = await tx.scheduledVisit.findFirst({ where: { id: visitId, tenantId } });
      if (!existing) return null;
      const updated = await tx.scheduledVisit.update({
        where: { id: visitId },
        data: { status: 'GENERATED', workOrderId },
      });
      return { ...updated, status: updated.status as ScheduledVisitRecord['status'] };
    });
  }

  async updateContractStatus(
    tenantId: string,
    contractId: string,
    status: AmcContractRecord['status'],
    cancellationReason?: string | null,
  ): Promise<AmcContractRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const existing = await tx.amcContract.findFirst({ where: { id: contractId, tenantId } });
      if (!existing) return null;
      const updated = await tx.amcContract.update({
        where: { id: contractId },
        data: {
          status,
          ...(cancellationReason !== undefined ? { cancellationReason } : {}),
        },
      });
      return this.mapContract(updated);
    });
  }

  async skipPendingVisits(tenantId: string, contractId: string): Promise<void> {
    await withTenantTransaction(tenantId, (tx) =>
      tx.scheduledVisit.updateMany({
        where: { tenantId, contractId, status: 'PENDING' },
        data: { status: 'SKIPPED' },
      }),
    );
  }

  private mapContract(c: Prisma.AmcContractGetPayload<object>): AmcContractRecord {
    return {
      ...c,
      price: c.price.toString(),
      visitFrequency: c.visitFrequency as VisitFrequency,
      coverageDetails: c.coverageDetails as Record<string, unknown>,
      status: c.status as AmcContractRecord['status'],
    };
  }
}
