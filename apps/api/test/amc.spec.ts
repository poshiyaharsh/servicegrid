import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NotFoundException } from '@nestjs/common';
import { AmcService } from '../src/modules/amc/amc.service';
import { InMemoryAmcStore } from '../src/modules/amc/in-memory-amc.store';
import { InMemoryWorkOrdersStore } from '../src/modules/work-orders/in-memory-work-orders.store';

describe('Phase 11 — AMC Contracts, Idempotent Visits & Profitability', () => {
  it('generates preventive visits idempotently, tracks renewals, cancellation, profitability, and isolation', async () => {
    const amcStore = new InMemoryAmcStore();
    const woStore = new InMemoryWorkOrdersStore();
    const amc = new AmcService(amcStore, woStore);

    const tenantA = '11111111-1111-4111-8111-111111111111';
    const tenantB = '99999999-9999-4999-8999-999999999999';
    const custA = '33333333-3333-4333-8333-333333333333';

    const created = await amc.createContract(tenantA, {
      customerId: custA,
      title: 'Comprehensive HVAC AMC (12 Units)',
      price: '24000.00',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-12-31T00:00:00.000Z',
      visitFrequency: 'QUARTERLY',
      coveredAssetIds: ['asset-1', 'asset-2'],
    });
    assert.equal(created.visits.length, 4);

    // Generate due visits as of 2026-04-15 -> Q1 (Jan) & Q2 (Apr) = 2 work orders
    const firstGen = await amc.generateDueVisits(
      tenantA,
      created.contract.id,
      new Date('2026-04-15T00:00:00.000Z'),
    );
    assert.equal(firstGen.generatedCount, 2);

    // Running again as of same date MUST be idempotent (0 duplicates)
    const secondGen = await amc.generateDueVisits(
      tenantA,
      created.contract.id,
      new Date('2026-04-15T00:00:00.000Z'),
    );
    assert.equal(secondGen.generatedCount, 0);
    assert.equal((await woStore.listWorkOrders(tenantA)).length, 2);

    // Renewal reminder within 30 days
    const reminders = await amc.getRenewalReminders(
      tenantA,
      30,
      new Date('2026-12-10T00:00:00.000Z'),
    );
    assert.equal(reminders.length, 1);

    // Profitability
    const prof = await amc.getProfitability(tenantA, created.contract.id, '6000.00');
    assert.equal(prof.profit, '18000.00');
    assert.equal(prof.marginPercent, 75);

    // Renew contract
    const renewed = await amc.renewContract(tenantA, created.contract.id, {
      startDate: '2027-01-01T00:00:00.000Z',
      endDate: '2027-12-31T00:00:00.000Z',
      price: '26000.00',
    });
    assert.equal(renewed.contract.renewedFromId, created.contract.id);
    assert.equal((await amcStore.findContractById(tenantA, created.contract.id))?.status, 'RENEWED');

    // Cancel new contract -> skips pending visits
    const cancelled = await amc.cancelContract(tenantA, renewed.contract.id, 'Customer relocated');
    assert.equal(cancelled.status, 'CANCELLED');
    const visitsAfterCancel = await amcStore.listVisits(tenantA, renewed.contract.id);
    assert.ok(visitsAfterCancel.every((v) => v.status === 'SKIPPED'));

    // Cross-tenant isolation
    await assert.rejects(
      () => amc.getProfitability(tenantB, created.contract.id, '0.00'),
      NotFoundException,
    );
  });
});
