import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import {
  WORKFLOWS_STORE,
  type WorkflowAction,
  type WorkflowCondition,
  type WorkflowRunRecord,
  type WorkflowsStore,
} from './workflows.store';

@Injectable()
export class WorkflowsService {
  constructor(@Inject(WORKFLOWS_STORE) private readonly store: WorkflowsStore) {}

  async listDefinitions(tenantId: string) {
    return this.store.listDefinitions(tenantId);
  }

  async createDefinition(
    tenantId: string,
    input: {
      name: string;
      triggerEvent: string;
      conditions?: WorkflowCondition[];
      actions: WorkflowAction[];
      delaySeconds?: number;
      maxDepth?: number;
    },
  ) {
    if (!input.name?.trim() || !input.triggerEvent?.trim() || input.actions.length === 0) {
      throw new BadRequestException('Workflow name, triggerEvent, and at least one action are required');
    }
    if ((input.delaySeconds ?? 0) < 0) {
      throw new BadRequestException('delaySeconds cannot be negative');
    }

    // Prevent direct self-triggering cycles
    const selfEmitting = input.actions.some(
      (a) => a.type === 'EMIT_EVENT' && a.config?.event === input.triggerEvent,
    );
    if (selfEmitting) {
      throw new BadRequestException(
        `Invalid workflow: trigger "${input.triggerEvent}" cannot directly emit itself`,
      );
    }

    return this.store.createDefinition({
      tenantId,
      name: input.name.trim(),
      triggerEvent: input.triggerEvent,
      conditions: input.conditions ?? [],
      actions: input.actions,
      delaySeconds: input.delaySeconds ?? 0,
      maxDepth: Math.min(10, Math.max(1, input.maxDepth ?? 5)),
    });
  }

  async listRuns(tenantId: string, correlationId?: string) {
    return this.store.listRuns(tenantId, correlationId);
  }

  async executeTrigger(
    tenantId: string,
    input: {
      triggerEvent: string;
      payload: Record<string, unknown>;
      correlationId?: string;
      depth?: number;
      visitedWorkflowIds?: string[];
    },
  ): Promise<WorkflowRunRecord[]> {
    const correlationId = input.correlationId ?? `corr_${crypto.randomBytes(6).toString('hex')}`;
    const depth = input.depth ?? 1;
    const visited = new Set(input.visitedWorkflowIds ?? []);

    const definitions = await this.store.listDefinitions(tenantId, input.triggerEvent);
    const runs: WorkflowRunRecord[] = [];

    for (const def of definitions) {
      if (!def.isActive) continue;

      if (visited.has(def.id) || depth > def.maxDepth) {
        const blocked = await this.store.createRun({
          tenantId,
          workflowId: def.id,
          triggerEvent: input.triggerEvent,
          correlationId,
          depth,
          status: 'BLOCKED_LOOP',
          executedActions: [],
          error: visited.has(def.id)
            ? `Infinite loop prevented: workflow ${def.id} already visited in correlation ${correlationId}`
            : `Max workflow depth (${def.maxDepth}) exceeded`,
          completedAt: new Date(),
        });
        runs.push(blocked);
        continue;
      }

      if (!this.matchesConditions(def.conditions, input.payload)) {
        continue;
      }

      const executedActions: string[] = [];
      const nextVisited = [...visited, def.id];

      for (const action of def.actions) {
        executedActions.push(action.type);
        if (action.type === 'EMIT_EVENT' && typeof action.config?.event === 'string') {
          const nested = await this.executeTrigger(tenantId, {
            triggerEvent: action.config.event,
            payload: input.payload,
            correlationId,
            depth: depth + 1,
            visitedWorkflowIds: nextVisited,
          });
          runs.push(...nested);
        }
      }

      const completed = await this.store.createRun({
        tenantId,
        workflowId: def.id,
        triggerEvent: input.triggerEvent,
        correlationId,
        depth,
        status: 'COMPLETED',
        executedActions,
        error: null,
        completedAt: new Date(),
      });
      runs.push(completed);
    }

    return runs;
  }

  private matchesConditions(
    conditions: WorkflowCondition[],
    payload: Record<string, unknown>,
  ): boolean {
    for (const cond of conditions) {
      const actual = payload[cond.field];
      if (cond.operator === 'EQUALS' && actual !== cond.value) return false;
      if (cond.operator === 'NOT_EQUALS' && actual === cond.value) return false;
      if (cond.operator === 'GT' && !(Number(actual) > Number(cond.value))) return false;
      if (cond.operator === 'LT' && !(Number(actual) < Number(cond.value))) return false;
      if (cond.operator === 'LTE' && !(Number(actual) <= Number(cond.value))) return false;
    }
    return true;
  }
}
