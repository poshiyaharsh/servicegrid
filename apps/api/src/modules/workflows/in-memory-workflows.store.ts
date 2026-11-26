import crypto from 'node:crypto';
import type {
  CustomerFeedbackRecord,
  WorkflowDefinitionRecord,
  WorkflowRunRecord,
  WorkflowsStore,
} from './workflows.store';

export class InMemoryWorkflowsStore implements WorkflowsStore {
  private definitions = new Map<string, WorkflowDefinitionRecord>();
  private runs: WorkflowRunRecord[] = [];
  private feedbacks: CustomerFeedbackRecord[] = [];

  async listDefinitions(tenantId: string, triggerEvent?: string) {
    return [...this.definitions.values()].filter(
      (d) => d.tenantId === tenantId && (!triggerEvent || d.triggerEvent === triggerEvent),
    );
  }

  async createDefinition(input: Omit<WorkflowDefinitionRecord, 'id' | 'isActive'>) {
    const rec: WorkflowDefinitionRecord = { id: crypto.randomUUID(), isActive: true, ...input };
    this.definitions.set(rec.id, rec);
    return rec;
  }

  async listRuns(tenantId: string, correlationId?: string) {
    return this.runs.filter(
      (r) => r.tenantId === tenantId && (!correlationId || r.correlationId === correlationId),
    );
  }

  async createRun(input: Omit<WorkflowRunRecord, 'id' | 'startedAt'>) {
    const rec: WorkflowRunRecord = { id: crypto.randomUUID(), startedAt: new Date(), ...input };
    this.runs.push(rec);
    return rec;
  }

  async createFeedback(input: Omit<CustomerFeedbackRecord, 'id' | 'createdAt'>) {
    const rec: CustomerFeedbackRecord = { id: crypto.randomUUID(), createdAt: new Date(), ...input };
    this.feedbacks.push(rec);
    return rec;
  }

  async listFeedback(tenantId: string) {
    return this.feedbacks.filter((f) => f.tenantId === tenantId);
  }
}
