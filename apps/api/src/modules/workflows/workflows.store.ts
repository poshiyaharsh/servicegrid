export interface WorkflowCondition {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GT' | 'LT' | 'LTE';
  value: string | number | boolean;
}

export interface WorkflowAction {
  type: 'NOTIFICATION' | 'ASSIGNMENT' | 'CREATE_INVOICE_DRAFT' | 'APPROVAL' | 'EMIT_EVENT';
  config: Record<string, unknown>;
}

export interface WorkflowDefinitionRecord {
  id: string;
  tenantId: string;
  name: string;
  triggerEvent: string;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  delaySeconds: number;
  maxDepth: number;
  isActive: boolean;
}

export interface WorkflowRunRecord {
  id: string;
  tenantId: string;
  workflowId: string;
  triggerEvent: string;
  correlationId: string;
  depth: number;
  status: 'COMPLETED' | 'BLOCKED_LOOP' | 'FAILED';
  executedActions: string[];
  error: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

export interface CustomerFeedbackRecord {
  id: string;
  tenantId: string;
  customerId: string;
  workOrderId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export const WORKFLOWS_STORE = Symbol('WORKFLOWS_STORE');

export interface WorkflowsStore {
  listDefinitions(tenantId: string, triggerEvent?: string): Promise<WorkflowDefinitionRecord[]>;
  createDefinition(
    input: Omit<WorkflowDefinitionRecord, 'id' | 'isActive'>,
  ): Promise<WorkflowDefinitionRecord>;
  listRuns(tenantId: string, correlationId?: string): Promise<WorkflowRunRecord[]>;
  createRun(input: Omit<WorkflowRunRecord, 'id' | 'startedAt'>): Promise<WorkflowRunRecord>;

  createFeedback(
    input: Omit<CustomerFeedbackRecord, 'id' | 'createdAt'>,
  ): Promise<CustomerFeedbackRecord>;
  listFeedback(tenantId: string): Promise<CustomerFeedbackRecord[]>;
}
