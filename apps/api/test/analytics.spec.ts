import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { InMemoryAmcStore } from '../src/modules/amc/in-memory-amc.store';
import { AiIntelligenceService } from '../src/modules/analytics/ai.service';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { InMemoryFinanceStore } from '../src/modules/finance/in-memory-finance.store';
import { InMemoryInventoryStore } from '../src/modules/inventory/in-memory-inventory.store';
import { InMemoryWorkOrdersStore } from '../src/modules/work-orders/in-memory-work-orders.store';

describe('Phase 13 — Analytics KPIs & Safe AI Intelligence', () => {
  it('computes operational & financial KPIs and enforces AI human-approval guardrails', async () => {
    const woStore = new InMemoryWorkOrdersStore();
    const finStore = new InMemoryFinanceStore();
    const invStore = new InMemoryInventoryStore();
    const amcStore = new InMemoryAmcStore();

    const analytics = new AnalyticsService(woStore, finStore, invStore, amcStore);
    const ai = new AiIntelligenceService();

    const tenantA = '11111111-1111-4111-8111-111111111111';

    const wo = await woStore.createWorkOrder({
      tenantId: tenantA,
      customerId: 'c-1',
      jobNumber: 'JOB-AN-1',
      title: 'AC Repair',
      priority: 'HIGH',
    });
    await woStore.assignTechnicians(tenantA, wo.id, [{ technicianUserId: 'tech-1', isLead: true }]);
    await woStore.updateWorkOrderStatus({
      tenantId: tenantA,
      workOrderId: wo.id,
      fromStatus: 'NEW',
      toStatus: 'COMPLETED',
    });

    await invStore.recordMovement({
      tenantId: tenantA,
      warehouseId: 'wh-1',
      productId: 'p-1',
      movementType: 'PURCHASE_RECEIPT',
      quantityDelta: 5,
    });
    await invStore.recordMovement({
      tenantId: tenantA,
      warehouseId: 'wh-1',
      productId: 'p-1',
      movementType: 'JOB_CONSUMPTION',
      quantityDelta: -2,
    });

    const metrics = await analytics.getDashboardMetrics(tenantA);
    assert.equal(metrics.totalJobs, 1);
    assert.equal(metrics.completedJobs, 1);
    assert.equal(metrics.pendingJobs, 0);
    assert.equal(metrics.firstTimeFixRate, 100);
    assert.equal(metrics.inventoryConsumption, 2);
    assert.equal(metrics.technicianProductivity[0]?.jobsCompleted, 1);

    // AI works without LLM configured (deterministic fallback) and always requires human approval
    const status = ai.getProviderStatus();
    assert.equal(status.llmDependent, false);

    const cls = ai.classifyComplaint('Split AC not cooling and water leaking');
    assert.equal(cls.result.category, 'HVAC_AC');
    assert.equal(cls.result.urgency, 'HIGH');
    assert.equal(cls.requiresHumanApproval, true);
    assert.equal(cls.canAutoFinalizeFinancialsOrJobs, false);

    const parts = ai.suggestSpareParts('AC compressor not cooling');
    assert.ok(parts.result.suggestedParts.includes('Dual Run Capacitor'));

    const anomalies = ai.detectAnomalies({
      cancelledJobsCount: 3,
      totalJobsCount: 10,
      lowStockCount: 2,
      overdueSlaCount: 1,
    });
    assert.equal(anomalies.result.anomalies.length, 3);
  });
});
