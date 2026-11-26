import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import { InMemorySubscriptionsStore } from '../src/modules/subscriptions/in-memory-subscriptions.store';
import { SubscriptionsService } from '../src/modules/subscriptions/subscriptions.service';

describe('Phase 16 — Commercial SaaS Subscriptions, Quotas & Webhooks', () => {
  it('supports trials, activation, upgrades/downgrades, usage limits, grace periods, and cancellation', async () => {
    const store = new InMemorySubscriptionsStore();
    const subs = new SubscriptionsService(store);
    const tenantA = '11111111-1111-4111-8111-111111111111';

    await subs.seedPlan({
      code: 'STARTER',
      name: 'Starter',
      monthlyPrice: '1499.00',
      annualPrice: '14990.00',
      maxTechnicians: 2,
      maxJobsPerMonth: 100,
      maxBranches: 1,
    });
    await subs.seedPlan({
      code: 'GROWTH',
      name: 'Growth',
      monthlyPrice: '3999.00',
      annualPrice: '39990.00',
      maxTechnicians: 10,
      maxJobsPerMonth: 1000,
      maxBranches: 5,
    });

    // 14-day trial
    const trial = await subs.startTrial(tenantA, 'STARTER', 14);
    assert.equal(trial.status, 'TRIALING');
    assert.ok(trial.trialEndsAt);

    // Usage limit enforcement (maxTechnicians = 2 on STARTER)
    await subs.checkAndConsumeQuota(tenantA, 'TECHNICIANS', '2026-11');
    await subs.checkAndConsumeQuota(tenantA, 'TECHNICIANS', '2026-11');
    await assert.rejects(
      () => subs.checkAndConsumeQuota(tenantA, 'TECHNICIANS', '2026-11'),
      ForbiddenException,
    );

    // Activate & Upgrade to GROWTH
    const active = await subs.activateOrRenew(tenantA, 'STARTER', 'MONTHLY');
    assert.equal(active.status, 'ACTIVE');
    await subs.changePlan(tenantA, 'GROWTH');

    // Failed payment webhook -> GRACE_PERIOD
    const grace = await subs.handlePaymentWebhook(tenantA, 'payment.failed', '3999.00');
    assert.equal(grace.status, 'GRACE_PERIOD');
    assert.ok(grace.gracePeriodEndsAt);

    // Succeeded payment webhook -> ACTIVE
    const renewed = await subs.handlePaymentWebhook(tenantA, 'payment.succeeded', '3999.00');
    assert.equal(renewed.status, 'ACTIVE');

    // Cancel
    const cancelled = await subs.cancelSubscription(tenantA, 'Seasonal pause');
    assert.equal(cancelled.status, 'CANCELLED');

    const history = await subs.getBillingHistory(tenantA);
    assert.ok(history.length >= 5);

    const overview = await subs.getSuperAdminOverview();
    assert.equal(overview.totalSubscriptions, 1);
    assert.equal(overview.cancelledCount, 1);
  });
});
