import crypto from 'node:crypto';
import type { WorkOrderStatus } from '@servicegrid/types';
import type {
  AttachmentCategory,
  AttachmentRecord,
  ChecklistItem,
  JobChecklistRecord,
  JobPriority,
  JobReportRecord,
  JobStatusHistoryRecord,
  RequestCategoryRecord,
  RequestSource,
  ServiceRequestRecord,
  WorkOrderAssignmentRecord,
  WorkOrderRecord,
  WorkOrderVisitRecord,
  WorkOrdersStore,
} from './work-orders.store';

export class InMemoryWorkOrdersStore implements WorkOrdersStore {
  private categories = new Map<string, RequestCategoryRecord>();
  private requests = new Map<string, ServiceRequestRecord>();
  private workOrders = new Map<string, WorkOrderRecord>();
  private assignments = new Map<string, WorkOrderAssignmentRecord>();
  private visits = new Map<string, WorkOrderVisitRecord>();
  private history = new Map<string, JobStatusHistoryRecord>();
  private checklists = new Map<string, JobChecklistRecord>();
  private attachments = new Map<string, AttachmentRecord>();
  private reports = new Map<string, JobReportRecord>();

  async listCategories(tenantId: string) {
    return [...this.categories.values()].filter((c) => c.tenantId === tenantId);
  }

  async createCategory(input: { tenantId: string; name: string; code: string; defaultSlaHours: number }) {
    const rec: RequestCategoryRecord = { id: crypto.randomUUID(), ...input, isActive: true };
    this.categories.set(rec.id, rec);
    return rec;
  }

  async findCategoryById(tenantId: string, categoryId: string) {
    const c = this.categories.get(categoryId);
    return c && c.tenantId === tenantId ? c : null;
  }

  async listServiceRequests(tenantId: string, status?: string) {
    return [...this.requests.values()].filter(
      (r) => r.tenantId === tenantId && (!status || r.status === status),
    );
  }

  async createServiceRequest(input: {
    tenantId: string;
    branchId?: string | null;
    customerId: string;
    assetId?: string | null;
    categoryId?: string | null;
    source: RequestSource;
    title: string;
    description: string;
    priority: JobPriority;
    slaDueAt: Date | null;
    createdByUserId?: string | null;
  }) {
    const rec: ServiceRequestRecord = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      branchId: input.branchId ?? null,
      customerId: input.customerId,
      assetId: input.assetId ?? null,
      categoryId: input.categoryId ?? null,
      source: input.source,
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: 'NEW',
      slaDueAt: input.slaDueAt,
      createdByUserId: input.createdByUserId ?? null,
      createdAt: new Date(),
    };
    this.requests.set(rec.id, rec);
    return rec;
  }

  async findServiceRequestById(tenantId: string, id: string) {
    const r = this.requests.get(id);
    return r && r.tenantId === tenantId ? r : null;
  }

  async markRequestConverted(tenantId: string, id: string) {
    const r = await this.findServiceRequestById(tenantId, id);
    if (r) this.requests.set(id, { ...r, status: 'CONVERTED' });
  }

  async listWorkOrders(tenantId: string, status?: WorkOrderStatus) {
    return [...this.workOrders.values()].filter(
      (w) => w.tenantId === tenantId && (!status || w.status === status),
    );
  }

  async createWorkOrder(input: {
    tenantId: string;
    branchId?: string | null;
    serviceRequestId?: string | null;
    customerId: string;
    assetId?: string | null;
    jobNumber: string;
    title: string;
    description?: string | null;
    priority: JobPriority;
    slaDueAt?: Date | null;
    actorUserId?: string | null;
  }) {
    const wo: WorkOrderRecord = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      branchId: input.branchId ?? null,
      serviceRequestId: input.serviceRequestId ?? null,
      customerId: input.customerId,
      assetId: input.assetId ?? null,
      jobNumber: input.jobNumber,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      status: 'NEW',
      scheduledStartAt: null,
      scheduledEndAt: null,
      slaDueAt: input.slaDueAt ?? null,
      technicianNotes: null,
      customerApprovedAt: null,
      cancellationReason: null,
      version: 1,
      createdAt: new Date(),
    };
    this.workOrders.set(wo.id, wo);

    const hist: JobStatusHistoryRecord = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      workOrderId: wo.id,
      fromStatus: null,
      toStatus: 'NEW',
      changedByUserId: input.actorUserId ?? null,
      reason: 'Work order created',
      changedAt: new Date(),
    };
    this.history.set(hist.id, hist);
    return wo;
  }

  async getWorkOrderDetails(tenantId: string, id: string) {
    const wo = this.workOrders.get(id);
    if (!wo || wo.tenantId !== tenantId) return null;
    return {
      workOrder: wo,
      assignments: [...this.assignments.values()].filter(
        (a) => a.tenantId === tenantId && a.workOrderId === id,
      ),
      visits: [...this.visits.values()].filter((v) => v.tenantId === tenantId && v.workOrderId === id),
      statusHistory: [...this.history.values()].filter(
        (h) => h.tenantId === tenantId && h.workOrderId === id,
      ),
      checklists: [...this.checklists.values()].filter(
        (c) => c.tenantId === tenantId && c.workOrderId === id,
      ),
      attachments: [...this.attachments.values()].filter(
        (a) => a.tenantId === tenantId && a.entityType === 'WORK_ORDER' && a.entityId === id,
      ),
      reports: [...this.reports.values()].filter(
        (r) => r.tenantId === tenantId && r.workOrderId === id,
      ),
    };
  }

  async updateWorkOrderStatus(input: {
    tenantId: string;
    workOrderId: string;
    fromStatus: WorkOrderStatus;
    toStatus: WorkOrderStatus;
    actorUserId?: string | null;
    reason?: string | null;
    cancellationReason?: string | null;
    technicianNotes?: string | null;
  }) {
    const wo = this.workOrders.get(input.workOrderId);
    if (!wo || wo.tenantId !== input.tenantId) return null;

    const updated: WorkOrderRecord = {
      ...wo,
      status: input.toStatus,
      version: wo.version + 1,
      ...(input.cancellationReason !== undefined ? { cancellationReason: input.cancellationReason } : {}),
      ...(input.technicianNotes !== undefined ? { technicianNotes: input.technicianNotes } : {}),
    };
    this.workOrders.set(wo.id, updated);

    const hist: JobStatusHistoryRecord = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      workOrderId: wo.id,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      changedByUserId: input.actorUserId ?? null,
      reason: input.reason ?? null,
      changedAt: new Date(),
    };
    this.history.set(hist.id, hist);
    return updated;
  }

  async assignTechnicians(
    tenantId: string,
    workOrderId: string,
    assignments: Array<{ technicianUserId: string; isLead?: boolean }>,
  ) {
    const created: WorkOrderAssignmentRecord[] = [];
    for (const item of assignments) {
      const rec: WorkOrderAssignmentRecord = {
        id: crypto.randomUUID(),
        tenantId,
        workOrderId,
        technicianUserId: item.technicianUserId,
        isLead: item.isLead ?? false,
        assignedAt: new Date(),
      };
      this.assignments.set(rec.id, rec);
      created.push(rec);
    }
    return created;
  }

  async addVisit(
    tenantId: string,
    workOrderId: string,
    input: { scheduledStartAt?: Date; scheduledEndAt?: Date; notes?: string },
  ) {
    const wo = this.workOrders.get(workOrderId);
    if (!wo || wo.tenantId !== tenantId) return null;
    const existing = [...this.visits.values()].filter(
      (v) => v.tenantId === tenantId && v.workOrderId === workOrderId,
    );
    const visit: WorkOrderVisitRecord = {
      id: crypto.randomUUID(),
      tenantId,
      workOrderId,
      visitNumber: existing.length + 1,
      scheduledStartAt: input.scheduledStartAt ?? null,
      scheduledEndAt: input.scheduledEndAt ?? null,
      status: 'SCHEDULED',
      notes: input.notes ?? null,
    };
    this.visits.set(visit.id, visit);
    return visit;
  }

  async createChecklist(
    tenantId: string,
    workOrderId: string,
    input: { title: string; items: ChecklistItem[] },
  ) {
    const wo = this.workOrders.get(workOrderId);
    if (!wo || wo.tenantId !== tenantId) return null;
    const cl: JobChecklistRecord = {
      id: crypto.randomUUID(),
      tenantId,
      workOrderId,
      title: input.title,
      items: input.items,
      completedAt: input.items.every((i) => i.completed) ? new Date() : null,
    };
    this.checklists.set(cl.id, cl);
    return cl;
  }

  async updateChecklist(
    tenantId: string,
    workOrderId: string,
    checklistId: string,
    items: ChecklistItem[],
  ) {
    const cl = this.checklists.get(checklistId);
    if (!cl || cl.tenantId !== tenantId || cl.workOrderId !== workOrderId) return null;
    const updated: JobChecklistRecord = {
      ...cl,
      items,
      completedAt: items.every((i) => i.completed) ? new Date() : null,
    };
    this.checklists.set(checklistId, updated);
    return updated;
  }

  async addAttachment(input: {
    tenantId: string;
    entityType: string;
    entityId: string;
    category: AttachmentCategory;
    fileName: string;
    mimeType: string;
    storageKey: string;
    uploadedByUserId?: string | null;
  }) {
    const att: AttachmentRecord = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      category: input.category,
      fileName: input.fileName,
      mimeType: input.mimeType,
      storageKey: input.storageKey,
      uploadedByUserId: input.uploadedByUserId ?? null,
      createdAt: new Date(),
    };
    this.attachments.set(att.id, att);
    return att;
  }

  async approveAndCreateReport(input: {
    tenantId: string;
    workOrderId: string;
    summary: string;
    workPerformed: string;
    approvedByName?: string | null;
    customerApproved: boolean;
  }) {
    const wo = this.workOrders.get(input.workOrderId);
    if (!wo || wo.tenantId !== input.tenantId) return null;
    if (input.customerApproved) {
      this.workOrders.set(wo.id, { ...wo, customerApprovedAt: new Date() });
    }
    const report: JobReportRecord = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      workOrderId: input.workOrderId,
      summary: input.summary,
      workPerformed: input.workPerformed,
      customerApproved: input.customerApproved,
      approvedByName: input.approvedByName ?? null,
      generatedAt: new Date(),
    };
    this.reports.set(report.id, report);
    return report;
  }
}
