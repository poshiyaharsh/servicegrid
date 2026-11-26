import { Injectable } from '@nestjs/common';
import { prisma, withTenantTransaction, type Prisma } from '@servicegrid/database';
import type {
  BillingCycle,
  PlanRecord,
  SubscriptionEventRecord,
  SubscriptionRecord,
  SubscriptionStatus,
  SubscriptionsStore,
  UsageRecordItem,
} from './subscriptions.store';

@Injectable()
export class PrismaSubscriptionsStore implements SubscriptionsStore {
  async listPlans(): Promise<PlanRecord[]> {
    const rows = await prisma.plan.findMany({ where: { isActive: true } });
    return rows.map((p) => this.mapPlan(p));
  }

  async findPlanByCode(code: string): Promise<PlanRecord | null> {
    const row = await prisma.plan.findUnique({ where: { code } });
    return row ? this.mapPlan(row) : null;
  }

  async findPlanById(id: string): Promise<PlanRecord | null> {
    const row = await prisma.plan.findUnique({ where: { id } });
    return row ? this.mapPlan(row) : null;
  }

  async upsertPlan(input: Omit<PlanRecord, 'id' | 'isActive'>): Promise<PlanRecord> {
    const row = await prisma.plan.upsert({
      where: { code: input.code },
      create: {
        ...input,
        features: input.features as Prisma.InputJsonValue,
      },
      update: {
        ...input,
        features: input.features as Prisma.InputJsonValue,
      },
    });
    return this.mapPlan(row);
  }

  async findSubscriptionByTenant(tenantId: string): Promise<SubscriptionRecord | null> {
    const row = await withTenantTransaction(tenantId, (tx) =>
      tx.subscription.findFirst({ where: { tenantId } }),
    );
    return row ? this.mapSub(row) : null;
  }

  async listAllSubscriptions(): Promise<SubscriptionRecord[]> {
    const rows = await prisma.subscription.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((r) => this.mapSub(r));
  }

  async upsertSubscription(input: Omit<SubscriptionRecord, 'id'>): Promise<SubscriptionRecord> {
    return withTenantTransaction(input.tenantId, async (tx) => {
      const row = await tx.subscription.upsert({
        where: { tenantId: input.tenantId },
        create: input,
        update: input,
      });
      return this.mapSub(row);
    });
  }

  async recordEvent(
    input: Omit<SubscriptionEventRecord, 'id' | 'createdAt'>,
  ): Promise<SubscriptionEventRecord> {
    const row = await withTenantTransaction(input.tenantId, (tx) =>
      tx.subscriptionEvent.create({
        data: {
          ...input,
          metadata: input.metadata as Prisma.InputJsonValue,
        },
      }),
    );
    return {
      ...row,
      amount: row.amount ? row.amount.toString() : null,
      metadata: row.metadata as Record<string, unknown>,
    };
  }

  async listEvents(tenantId: string): Promise<SubscriptionEventRecord[]> {
    const rows = await withTenantTransaction(tenantId, (tx) =>
      tx.subscriptionEvent.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),
    );
    return rows.map((r) => ({
      ...r,
      amount: r.amount ? r.amount.toString() : null,
      metadata: r.metadata as Record<string, unknown>,
    }));
  }

  async getOrInitUsage(
    tenantId: string,
    metricKey: UsageRecordItem['metricKey'],
    periodKey: string,
    limitCount: number,
  ): Promise<UsageRecordItem> {
    return withTenantTransaction(tenantId, async (tx) => {
      const row = await tx.usageRecord.upsert({
        where: { tenantId_metricKey_periodKey: { tenantId, metricKey, periodKey } },
        create: { tenantId, metricKey, periodKey, usedCount: 0, limitCount },
        update: {},
      });
      return { ...row, metricKey: row.metricKey as UsageRecordItem['metricKey'] };
    });
  }

  async incrementUsage(
    tenantId: string,
    metricKey: UsageRecordItem['metricKey'],
    periodKey: string,
    delta = 1,
  ): Promise<UsageRecordItem> {
    return withTenantTransaction(tenantId, async (tx) => {
      const row = await tx.usageRecord.update({
        where: { tenantId_metricKey_periodKey: { tenantId, metricKey, periodKey } },
        data: { usedCount: { increment: delta } },
      });
      return { ...row, metricKey: row.metricKey as UsageRecordItem['metricKey'] };
    });
  }

  private mapPlan(p: Prisma.PlanGetPayload<object>): PlanRecord {
    return {
      ...p,
      monthlyPrice: p.monthlyPrice.toString(),
      annualPrice: p.annualPrice.toString(),
      features: p.features as Record<string, unknown>,
    };
  }

  private mapSub(s: Prisma.SubscriptionGetPayload<object>): SubscriptionRecord {
    return {
      ...s,
      billingCycle: s.billingCycle as BillingCycle,
      status: s.status as SubscriptionStatus,
    };
  }
}
