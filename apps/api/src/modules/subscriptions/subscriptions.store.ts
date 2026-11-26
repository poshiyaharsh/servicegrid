export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'GRACE_PERIOD' | 'CANCELLED';
export type BillingCycle = 'MONTHLY' | 'ANNUAL';

export interface PlanRecord {
  id: string;
  code: string;
  name: string;
  monthlyPrice: string;
  annualPrice: string;
  currency: string;
  maxTechnicians: number;
  maxJobsPerMonth: number;
  maxBranches: number;
  features: Record<string, unknown>;
  isActive: boolean;
}

export interface SubscriptionRecord {
  id: string;
  tenantId: string;
  planId: string;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  gracePeriodEndsAt: Date | null;
  cancelledAt: Date | null;
}

export interface SubscriptionEventRecord {
  id: string;
  tenantId: string;
  subscriptionId: string;
  eventType: string;
  amount: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface UsageRecordItem {
  id: string;
  tenantId: string;
  metricKey: 'TECHNICIANS' | 'JOBS_MONTHLY' | 'BRANCHES';
  periodKey: string;
  usedCount: number;
  limitCount: number;
}

export const SUBSCRIPTIONS_STORE = Symbol('SUBSCRIPTIONS_STORE');

export interface SubscriptionsStore {
  listPlans(): Promise<PlanRecord[]>;
  findPlanByCode(code: string): Promise<PlanRecord | null>;
  findPlanById(id: string): Promise<PlanRecord | null>;
  upsertPlan(input: Omit<PlanRecord, 'id' | 'isActive'>): Promise<PlanRecord>;

  findSubscriptionByTenant(tenantId: string): Promise<SubscriptionRecord | null>;
  listAllSubscriptions(): Promise<SubscriptionRecord[]>;
  upsertSubscription(
    input: Omit<SubscriptionRecord, 'id'>,
  ): Promise<SubscriptionRecord>;

  recordEvent(input: Omit<SubscriptionEventRecord, 'id' | 'createdAt'>): Promise<SubscriptionEventRecord>;
  listEvents(tenantId: string): Promise<SubscriptionEventRecord[]>;

  getOrInitUsage(
    tenantId: string,
    metricKey: UsageRecordItem['metricKey'],
    periodKey: string,
    limitCount: number,
  ): Promise<UsageRecordItem>;
  incrementUsage(
    tenantId: string,
    metricKey: UsageRecordItem['metricKey'],
    periodKey: string,
    delta?: number,
  ): Promise<UsageRecordItem>;
}
