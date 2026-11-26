import { Inject, Injectable } from '@nestjs/common';
import { AMC_STORE, type AmcStore } from '../amc/amc.store';
import { FINANCE_STORE, type FinanceStore } from '../finance/finance.store';
import { addDecimals } from '../finance/money.util';
import { INVENTORY_STORE, type InventoryStore } from '../inventory/inventory.store';
import { WORK_ORDERS_STORE, type WorkOrdersStore } from '../work-orders/work-orders.store';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(WORK_ORDERS_STORE) private readonly workOrdersStore: WorkOrdersStore,
    @Inject(FINANCE_STORE) private readonly financeStore: FinanceStore,
    @Inject(INVENTORY_STORE) private readonly inventoryStore: InventoryStore,
    @Inject(AMC_STORE) private readonly amcStore: AmcStore,
  ) {}

  async getDashboardMetrics(tenantId: string, csatAverage = 4.6) {
    const [workOrders, outstandingInvoices, movements, contracts] = await Promise.all([
      this.workOrdersStore.listWorkOrders(tenantId),
      this.financeStore.listOutstandingInvoices(tenantId),
      this.inventoryStore.listMovements(tenantId),
      this.amcStore.listContracts(tenantId),
    ]);

    const totalJobs = workOrders.length;
    const completedJobsList = workOrders.filter((w) => w.status === 'COMPLETED');
    const completedJobs = completedJobsList.length;
    const pendingJobs = workOrders.filter(
      (w) => w.status !== 'COMPLETED' && w.status !== 'CANCELLED',
    ).length;

    let outstandingPayments = '0.00';
    let revenue = '0.00';
    for (const inv of outstandingInvoices) {
      outstandingPayments = addDecimals(outstandingPayments, inv.balanceDue);
      revenue = addDecimals(revenue, inv.paidTotal);
    }

    const techMap = new Map<string, number>();
    let singleVisitCompleted = 0;
    const branchMap = new Map<string, { totalJobs: number; completedJobs: number }>();

    for (const wo of workOrders) {
      const branchKey = wo.branchId ?? 'UNASSIGNED';
      const bStat = branchMap.get(branchKey) ?? { totalJobs: 0, completedJobs: 0 };
      bStat.totalJobs += 1;
      if (wo.status === 'COMPLETED') bStat.completedJobs += 1;
      branchMap.set(branchKey, bStat);

      const details = await this.workOrdersStore.getWorkOrderDetails(tenantId, wo.id);
      if (details) {
        if (wo.status === 'COMPLETED' && details.visits.length <= 1) {
          singleVisitCompleted++;
        }
        if (wo.status === 'COMPLETED') {
          for (const a of details.assignments) {
            techMap.set(a.technicianUserId, (techMap.get(a.technicianUserId) ?? 0) + 1);
          }
        }
      }
    }

    const firstTimeFixRate =
      completedJobs > 0 ? Math.round((singleVisitCompleted / completedJobs) * 100) : 100;

    const inventoryConsumption = movements
      .filter((m) => m.movementType === 'JOB_CONSUMPTION')
      .reduce((sum, m) => sum + Math.abs(m.quantityDelta), 0);

    const now = new Date();
    const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const contractRenewalsDue = contracts.filter(
      (c) => c.status === 'ACTIVE' && c.endDate >= now && c.endDate <= horizon,
    ).length;

    return {
      totalJobs,
      completedJobs,
      pendingJobs,
      revenue,
      outstandingPayments,
      technicianProductivity: [...techMap.entries()].map(([technicianUserId, jobsCompleted]) => ({
        technicianUserId,
        jobsCompleted,
      })),
      firstTimeFixRate,
      customerSatisfaction: csatAverage,
      inventoryConsumption,
      contractRenewalsDue,
      branchPerformance: [...branchMap.entries()].map(([branchId, stats]) => ({
        branchId,
        ...stats,
      })),
    };
  }
}
