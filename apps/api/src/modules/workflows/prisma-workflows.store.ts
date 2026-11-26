import { Injectable } from '@nestjs/common';
import { withTenantTransaction, type Prisma } from '@servicegrid/database';
import type {
  CustomerFeedbackRecord,
  WorkflowAction,
  WorkflowCondition,
  WorkflowDefinitionRecord,
  WorkflowRunRecord,
  WorkflowsStore,
} from './workflows.store';

@Injectable()
export class PrismaWorkflowsStore implements WorkflowsStore {
  async listDefinitions(tenantId: string, triggerEvent?: string): Promise<WorkflowDefinitionRecord[]> {
    const rows = await withTenantTransaction(tenantId, (tx) =>
      tx.workflowDefinition.findMany({
        where: { tenantId, ...(triggerEvent ? { triggerEvent } : {}) },
        orderBy: { createdAt: 'desc' },
      }),
    );
    return rows.map((d) => ({
      ...d,
      conditions: d.conditions as unknown as WorkflowCondition[],
      actions: d.actions as unknown as WorkflowAction[],
    }));
  }

  async createDefinition(
    input: Omit<WorkflowDefinitionRecord, 'id' | 'isActive'>,
  ): Promise<WorkflowDefinitionRecord> {
    const row = await withTenantTransaction(input.tenantId, (tx) =>
      tx.workflowDefinition.create({
        data: {
          tenantId: input.tenantId,
          name: input.name,
          triggerEvent: input.triggerEvent,
          conditions: input.conditions as unknown as Prisma.InputJsonValue,
          actions: input.actions as unknown as Prisma.InputJsonValue,
          delaySeconds: input.delaySeconds,
          maxDepth: input.maxDepth,
        },
      }),
    );
    return {
      ...row,
      conditions: row.conditions as unknown as WorkflowCondition[],
      actions: row.actions as unknown as WorkflowAction[],
    };
  }

  async listRuns(tenantId: string, correlationId?: string): Promise<WorkflowRunRecord[]> {
    const rows = await withTenantTransaction(tenantId, (tx) =>
      tx.workflowRun.findMany({
        where: { tenantId, ...(correlationId ? { correlationId } : {}) },
        orderBy: { startedAt: 'desc' },
      }),
    );
    return rows.map((r) => ({
      ...r,
      status: r.status as WorkflowRunRecord['status'],
      executedActions: r.executedActions as unknown as string[],
    }));
  }

  async createRun(input: Omit<WorkflowRunRecord, 'id' | 'startedAt'>): Promise<WorkflowRunRecord> {
    const row = await withTenantTransaction(input.tenantId, (tx) =>
      tx.workflowRun.create({
        data: {
          ...input,
          executedActions: input.executedActions as unknown as Prisma.InputJsonValue,
        },
      }),
    );
    return {
      ...row,
      status: row.status as WorkflowRunRecord['status'],
      executedActions: row.executedActions as unknown as string[],
    };
  }

  async createFeedback(
    input: Omit<CustomerFeedbackRecord, 'id' | 'createdAt'>,
  ): Promise<CustomerFeedbackRecord> {
    return withTenantTransaction(input.tenantId, (tx) =>
      tx.customerFeedback.create({ data: input }),
    );
  }

  async listFeedback(tenantId: string): Promise<CustomerFeedbackRecord[]> {
    return withTenantTransaction(tenantId, (tx) =>
      tx.customerFeedback.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),
    );
  }
}
