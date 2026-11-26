import crypto from 'node:crypto';
import type {
  PlanRecord,
  SubscriptionEventRecord,
  SubscriptionRecord,
  SubscriptionsStore,
  UsageRecordItem,
} from './subscriptions.store';

export class InMemorySubscriptionsStore implements SubscriptionsStore {
  private plans = new Map<string, PlanRecord>();
  private subscriptions = new Map<string, SubscriptionRecord>();
  private events: SubscriptionEventRecord[] = [];
  private usage = new Map<string, UsageRecordItem>();

  async listPlans() {
    return [...this.plans.values()];
  }

  async findPlanByCode(code: string) {
    return [...this.plans.values()].find((p) => p.code === code) ?? null;
  }

  async findPlanById(id: string) {
    return this.plans.get(id) ?? null;
  }

  async upsertPlan(input: Omit<PlanRecord, 'id' | 'isActive'>) {
    const existing = await this.findPlanByCode(input.code);
    const rec: PlanRecord = { id: existing?.id ?? crypto.randomUUID(), isActive: true, ...input };
    this.plans.set(rec.id, rec);
    return rec;
  }

  async findSubscriptionByTenant(tenantId: string) {
    return this.subscriptions.get(tenantId) ?? null;
  }

  async listAllSubscriptions() {
    return [...this.subscriptions.values()];
  }

  async upsertSubscription(input: Omit<SubscriptionRecord, 'id'>) {
    const existing = this.subscriptions.get(input.tenantId);
    const rec: SubscriptionRecord = { id: existing?.id ?? crypto.randomUUID(), ...input };
    this.subscriptions.set(input.tenantId, rec);
    return rec;
  }

  async recordEvent(input: Omit<SubscriptionEventRecord, 'id' | 'createdAt'>) {
    const rec: SubscriptionEventRecord = { id: crypto.randomUUID(), createdAt: new Date(), ...input };
    this.events.push(rec);
    return rec;
  }

  async listEvents(tenantId: string) {
    return this.events.filter((e) => e.tenantId === tenantId);
  }

  async getOrInitUsage(
    tenantId: string,
    metricKey: UsageRecordItem['metricKey'],
    periodKey: string,
    limitCount: number,
  ) {
    const key = `${tenantId}:${metricKey}:${periodKey}`;
    const existing = this.usage.get(key);
    if (existing) return existing;
    const rec: UsageRecordItem = {
      id: crypto.randomUUID(),
      tenantId,
      metricKey,
      periodKey,
      usedCount: 0,
      limitCount,
    };
    this.usage.set(key, rec);
    return rec;
  }

  async incrementUsage(
    tenantId: string,
    metricKey: UsageRecordItem['metricKey'],
    periodKey: string,
    delta = 1,
  ) {
    const key = `${tenantId}:${metricKey}:${periodKey}`;
    const existing = this.usage.get(key);
    if (!existing) throw new Error('Usage record not initialized');
    const updated = { ...existing, usedCount: existing.usedCount + delta };
    this.usage.set(key, updated);
    return updated;
  }
}
