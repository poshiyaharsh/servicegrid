import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { formatMinorToDecimal, parseDecimalToMinor, subtractDecimals } from '../finance/money.util';
import { WORK_ORDERS_STORE, type WorkOrdersStore } from '../work-orders/work-orders.store';
import { AMC_STORE, type AmcStore, type VisitFrequency } from './amc.store';

const FREQUENCY_MONTHS: Record<VisitFrequency, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  HALF_YEARLY: 6,
  YEARLY: 12,
};

@Injectable()
export class AmcService {
  constructor(
    @Inject(AMC_STORE) private readonly store: AmcStore,
    @Inject(WORK_ORDERS_STORE) private readonly workOrdersStore: WorkOrdersStore,
  ) {}

  async listContracts(tenantId: string) {
    return this.store.listContracts(tenantId);
  }

  async createContract(
    tenantId: string,
    input: {
      customerId: string;
      title: string;
      price: string;
      currency?: string;
      startDate: string;
      endDate: string;
      visitFrequency: VisitFrequency;
      coverageDetails?: Record<string, unknown>;
      coveredAssetIds?: string[];
      renewedFromId?: string | null;
    },
  ) {
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException('Contract endDate must be after startDate');
    }

    const priceFormatted = formatMinorToDecimal(parseDecimalToMinor(input.price));
    const visits = this.buildSchedule(startDate, endDate, input.visitFrequency);
    const contractNumber = `AMC-${Date.now().toString(36).toUpperCase()}`;

    return this.store.createContractWithVisits(
      {
        tenantId,
        customerId: input.customerId,
        contractNumber,
        title: input.title,
        price: priceFormatted,
        currency: input.currency ?? 'INR',
        startDate,
        endDate,
        visitFrequency: input.visitFrequency,
        coverageDetails: input.coverageDetails ?? {},
        coveredAssetIds: input.coveredAssetIds ?? [],
        status: 'ACTIVE',
        cancellationReason: null,
        renewedFromId: input.renewedFromId ?? null,
      },
      visits,
    );
  }

  /**
   * Idempotently generates Work Orders for due PENDING visits.
   * Already-generated visits are skipped so duplicate jobs are never created.
   */
  async generateDueVisits(tenantId: string, contractId: string, asOfDate = new Date()) {
    const contract = await this.store.findContractById(tenantId, contractId);
    if (!contract) throw new NotFoundException('AMC contract not found');
    if (contract.status !== 'ACTIVE') {
      throw new BadRequestException('Can only generate visits for ACTIVE AMC contracts');
    }

    const visits = await this.store.listVisits(tenantId, contractId);
    const generated = [];

    for (const visit of visits) {
      if (visit.status !== 'PENDING' || visit.workOrderId) continue;
      if (visit.scheduledDate > asOfDate) continue;

      const wo = await this.workOrdersStore.createWorkOrder({
        tenantId,
        customerId: contract.customerId,
        assetId: contract.coveredAssetIds[0] ?? null,
        jobNumber: `PM-${contract.contractNumber}-${visit.visitKey}`,
        title: `Preventive Maintenance: ${contract.title} (${visit.visitKey})`,
        description: `Scheduled AMC visit under ${contract.contractNumber}`,
        priority: 'MEDIUM',
      });

      const updatedVisit = await this.store.markVisitGenerated(tenantId, visit.id, wo.id);
      generated.push({ visit: updatedVisit, workOrder: wo });
    }

    return { generatedCount: generated.length, generated };
  }

  async getRenewalReminders(tenantId: string, withinDays = 30, asOf = new Date()) {
    const contracts = await this.store.listContracts(tenantId);
    const horizon = new Date(asOf.getTime() + withinDays * 24 * 60 * 60 * 1000);
    return contracts.filter(
      (c) => c.status === 'ACTIVE' && c.endDate >= asOf && c.endDate <= horizon,
    );
  }

  async renewContract(
    tenantId: string,
    contractId: string,
    input: { startDate: string; endDate: string; price?: string },
  ) {
    const existing = await this.store.findContractById(tenantId, contractId);
    if (!existing) throw new NotFoundException('AMC contract not found');

    await this.store.updateContractStatus(tenantId, contractId, 'RENEWED');
    return this.createContract(tenantId, {
      customerId: existing.customerId,
      title: existing.title,
      price: input.price ?? existing.price,
      currency: existing.currency,
      startDate: input.startDate,
      endDate: input.endDate,
      visitFrequency: existing.visitFrequency,
      coverageDetails: existing.coverageDetails,
      coveredAssetIds: existing.coveredAssetIds,
      renewedFromId: existing.id,
    });
  }

  async cancelContract(tenantId: string, contractId: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('Cancellation reason is required');
    const updated = await this.store.updateContractStatus(tenantId, contractId, 'CANCELLED', reason);
    if (!updated) throw new NotFoundException('AMC contract not found');
    await this.store.skipPendingVisits(tenantId, contractId);
    return updated;
  }

  async getProfitability(tenantId: string, contractId: string, incurredCost: string) {
    const contract = await this.store.findContractById(tenantId, contractId);
    if (!contract) throw new NotFoundException('AMC contract not found');

    const costFormatted = formatMinorToDecimal(parseDecimalToMinor(incurredCost));
    const profit = subtractDecimals(contract.price, costFormatted);
    const revenueMinor = parseDecimalToMinor(contract.price);
    const profitMinor = parseDecimalToMinor(profit);
    const marginPercent =
      revenueMinor > 0n ? Number((profitMinor * 10000n) / revenueMinor) / 100 : 0;

    return {
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      revenue: contract.price,
      incurredCost: costFormatted,
      profit,
      marginPercent,
    };
  }

  private buildSchedule(startDate: Date, endDate: Date, frequency: VisitFrequency) {
    const stepMonths = FREQUENCY_MONTHS[frequency];
    const visits: Array<{ visitKey: string; scheduledDate: Date }> = [];
    const cursor = new Date(startDate);
    let idx = 1;

    while (cursor <= endDate) {
      const ym = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
      visits.push({
        visitKey: `V${idx}-${ym}`,
        scheduledDate: new Date(cursor),
      });
      cursor.setUTCMonth(cursor.getUTCMonth() + stepMonths);
      idx++;
    }
    return visits;
  }
}
