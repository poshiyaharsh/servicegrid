import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  SUBSCRIPTIONS_STORE,
  type BillingCycle,
  type SubscriptionsStore,
  type UsageRecordItem,
} from './subscriptions.store';

@Injectable()
export class SubscriptionsService {
  constructor(@Inject(SUBSCRIPTIONS_STORE) private readonly store: SubscriptionsStore) {}

  async listPlans() {
    return this.store.listPlans();
  }

  async seedPlan(input: {
    code: string;
    name: string;
    monthlyPrice: string;
    annualPrice: string;
    currency?: string;
    maxTechnicians: number;
    maxJobsPerMonth: number;
    maxBranches: number;
    features?: Record<string, unknown>;
  }) {
    return this.store.upsertPlan({
      code: input.code.toUpperCase(),
      name: input.name,
      monthlyPrice: input.monthlyPrice,
      annualPrice: input.annualPrice,
      currency: input.currency ?? 'INR',
      maxTechnicians: input.maxTechnicians,
      maxJobsPerMonth: input.maxJobsPerMonth,
      maxBranches: input.maxBranches,
      features: input.features ?? {},
    });
  }

  async startTrial(tenantId: string, planCode: string, trialDays = 14) {
    const plan = await this.store.findPlanByCode(planCode.toUpperCase());
    if (!plan) throw new NotFoundException(`Plan ${planCode} not found`);

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
    const sub = await this.store.upsertSubscription({
      tenantId,
      planId: plan.id,
      billingCycle: 'MONTHLY',
      status: 'TRIALING',
      trialEndsAt,
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt,
      gracePeriodEndsAt: null,
      cancelledAt: null,
    });

    await this.store.recordEvent({
      tenantId,
      subscriptionId: sub.id,
      eventType: 'TRIAL_STARTED',
      amount: '0.00',
      metadata: { planCode: plan.code, trialDays },
    });

    return sub;
  }

  async activateOrRenew(tenantId: string, planCode: string, billingCycle: BillingCycle = 'MONTHLY') {
    const plan = await this.store.findPlanByCode(planCode.toUpperCase());
    if (!plan) throw new NotFoundException(`Plan ${planCode} not found`);

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'ANNUAL') periodEnd.setUTCFullYear(periodEnd.getUTCFullYear() + 1);
    else periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);

    const amount = billingCycle === 'ANNUAL' ? plan.annualPrice : plan.monthlyPrice;
    const sub = await this.store.upsertSubscription({
      tenantId,
      planId: plan.id,
      billingCycle,
      status: 'ACTIVE',
      trialEndsAt: null,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      gracePeriodEndsAt: null,
      cancelledAt: null,
    });

    await this.store.recordEvent({
      tenantId,
      subscriptionId: sub.id,
      eventType: 'SUBSCRIPTION_ACTIVATED',
      amount,
      metadata: { planCode: plan.code, billingCycle },
    });

    return sub;
  }

  async changePlan(tenantId: string, targetPlanCode: string) {
    const current = await this.store.findSubscriptionByTenant(tenantId);
    if (!current) throw new NotFoundException('Subscription not found');
    const currentPlan = await this.store.findPlanById(current.planId);
    const nextPlan = await this.store.findPlanByCode(targetPlanCode.toUpperCase());
    if (!nextPlan) throw new NotFoundException(`Plan ${targetPlanCode} not found`);

    const isUpgrade = nextPlan.maxTechnicians >= (currentPlan?.maxTechnicians ?? 0);
    const updated = await this.store.upsertSubscription({
      ...current,
      planId: nextPlan.id,
    });

    await this.store.recordEvent({
      tenantId,
      subscriptionId: updated.id,
      eventType: isUpgrade ? 'PLAN_UPGRADED' : 'PLAN_DOWNGRADED',
      amount: updated.billingCycle === 'ANNUAL' ? nextPlan.annualPrice : nextPlan.monthlyPrice,
      metadata: { from: currentPlan?.code, to: nextPlan.code },
    });
    return updated;
  }

  async cancelSubscription(tenantId: string, reason: string) {
    const current = await this.store.findSubscriptionByTenant(tenantId);
    if (!current) throw new NotFoundException('Subscription not found');

    const cancelled = await this.store.upsertSubscription({
      ...current,
      status: 'CANCELLED',
      cancelledAt: new Date(),
    });
    await this.store.recordEvent({
      tenantId,
      subscriptionId: cancelled.id,
      eventType: 'SUBSCRIPTION_CANCELLED',
      amount: null,
      metadata: { reason },
    });
    return cancelled;
  }

  async handlePaymentWebhook(
    tenantId: string,
    eventType: 'payment.succeeded' | 'payment.failed',
    amount: string,
  ) {
    const current = await this.store.findSubscriptionByTenant(tenantId);
    if (!current) throw new NotFoundException('Subscription not found');

    if (eventType === 'payment.succeeded') {
      const nextEnd = new Date(current.currentPeriodEnd);
      nextEnd.setUTCMonth(nextEnd.getUTCMonth() + (current.billingCycle === 'ANNUAL' ? 12 : 1));
      const renewed = await this.store.upsertSubscription({
        ...current,
        status: 'ACTIVE',
        gracePeriodEndsAt: null,
        currentPeriodEnd: nextEnd,
      });
      await this.store.recordEvent({
        tenantId,
        subscriptionId: renewed.id,
        eventType: 'RENEWAL_PAID',
        amount,
        metadata: {},
      });
      return renewed;
    }

    // Failed payment -> 7-day grace period
    const graceEnds = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const graceSub = await this.store.upsertSubscription({
      ...current,
      status: 'GRACE_PERIOD',
      gracePeriodEndsAt: graceEnds,
    });
    await this.store.recordEvent({
      tenantId,
      subscriptionId: graceSub.id,
      eventType: 'PAYMENT_FAILED_GRACE_STARTED',
      amount,
      metadata: { gracePeriodEndsAt: graceEnds.toISOString() },
    });
    return graceSub;
  }

  async checkAndConsumeQuota(
    tenantId: string,
    metricKey: UsageRecordItem['metricKey'],
    periodKey: string,
  ) {
    const sub = await this.store.findSubscriptionByTenant(tenantId);
    if (!sub || sub.status === 'CANCELLED') {
      throw new ForbiddenException('Active subscription required');
    }
    const plan = await this.store.findPlanById(sub.planId);
    if (!plan) throw new BadRequestException('Subscription plan missing');

    const limit =
      metricKey === 'TECHNICIANS'
        ? plan.maxTechnicians
        : metricKey === 'BRANCHES'
          ? plan.maxBranches
          : plan.maxJobsPerMonth;

    const usage = await this.store.getOrInitUsage(tenantId, metricKey, periodKey, limit);
    if (usage.usedCount >= usage.limitCount) {
      throw new ForbiddenException(`Plan usage limit reached for ${metricKey} (${limit})`);
    }
    return this.store.incrementUsage(tenantId, metricKey, periodKey, 1);
  }

  async getBillingHistory(tenantId: string) {
    return this.store.listEvents(tenantId);
  }

  async getSuperAdminOverview() {
    const subs = await this.store.listAllSubscriptions();
    return {
      totalSubscriptions: subs.length,
      activeCount: subs.filter((s) => s.status === 'ACTIVE').length,
      trialingCount: subs.filter((s) => s.status === 'TRIALING').length,
      gracePeriodCount: subs.filter((s) => s.status === 'GRACE_PERIOD').length,
      cancelledCount: subs.filter((s) => s.status === 'CANCELLED').length,
    };
  }
}
