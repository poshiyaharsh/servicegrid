import { Injectable } from '@nestjs/common';
import { withTenantTransaction, type Prisma } from '@servicegrid/database';
import type { WorkOrderStatus } from '@servicegrid/types';
import type {
  AttachmentCategory,
  AttachmentRecord,
  ChecklistItem,
  JobChecklistRecord,
  JobPriority,
  JobReportRecord,
  RequestCategoryRecord,
  RequestSource,
  ServiceRequestRecord,
  WorkOrderAssignmentRecord,
  WorkOrderRecord,
  WorkOrderVisitRecord,
  WorkOrdersStore,
} from './work-orders.store';

@Injectable()
export class PrismaWorkOrdersStore implements WorkOrdersStore {
  async listCategories(tenantId: string): Promise<RequestCategoryRecord[]> {
    return withTenantTransaction(tenantId, (tx) =>
      tx.requestCategory.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
    );
  }

  async createCategory(input: {
    tenantId: string;
    name: string;
    code: string;
    defaultSlaHours: number;
  }): Promise<RequestCategoryRecord> {
    return withTenantTransaction(input.tenantId, (tx) => tx.requestCategory.create({ data: input }));
  }

  async findCategoryById(tenantId: string, categoryId: string): Promise<RequestCategoryRecord | null> {
    return withTenantTransaction(tenantId, (tx) =>
      tx.requestCategory.findFirst({ where: { id: categoryId, tenantId } }),
    );
  }

  async listServiceRequests(tenantId: string, status?: string): Promise<ServiceRequestRecord[]> {
    const rows = await withTenantTransaction(tenantId, (tx) =>
      tx.serviceRequest.findMany({
        where: { tenantId, ...(status ? { status } : {}) },
        orderBy: { createdAt: 'desc' },
      }),
    );
    return rows.map((r) => ({
      ...r,
      source: r.source as RequestSource,
      priority: r.priority as JobPriority,
    }));
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
  }): Promise<ServiceRequestRecord> {
    const row = await withTenantTransaction(input.tenantId, (tx) =>
      tx.serviceRequest.create({ data: input }),
    );
    return {
      ...row,
      source: row.source as RequestSource,
      priority: row.priority as JobPriority,
    };
  }

  async findServiceRequestById(tenantId: string, id: string): Promise<ServiceRequestRecord | null> {
    const row = await withTenantTransaction(tenantId, (tx) =>
      tx.serviceRequest.findFirst({ where: { id, tenantId } }),
    );
    if (!row) return null;
    return {
      ...row,
      source: row.source as RequestSource,
      priority: row.priority as JobPriority,
    };
  }

  async markRequestConverted(tenantId: string, id: string): Promise<void> {
    await withTenantTransaction(tenantId, (tx) =>
      tx.serviceRequest.updateMany({ where: { id, tenantId }, data: { status: 'CONVERTED' } }),
    );
  }

  async listWorkOrders(tenantId: string, status?: WorkOrderStatus): Promise<WorkOrderRecord[]> {
    const rows = await withTenantTransaction(tenantId, (tx) =>
      tx.workOrder.findMany({
        where: { tenantId, ...(status ? { status } : {}) },
        orderBy: { createdAt: 'desc' },
      }),
    );
    return rows.map((w) => ({
      ...w,
      priority: w.priority as JobPriority,
      status: w.status as WorkOrderStatus,
    }));
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
  }): Promise<WorkOrderRecord> {
    return withTenantTransaction(input.tenantId, async (tx) => {
      const wo = await tx.workOrder.create({
        data: {
          tenantId: input.tenantId,
          branchId: input.branchId ?? null,
          serviceRequestId: input.serviceRequestId ?? null,
          customerId: input.customerId,
          assetId: input.assetId ?? null,
          jobNumber: input.jobNumber,
          title: input.title,
          description: input.description ?? null,
          priority: input.priority,
          slaDueAt: input.slaDueAt ?? null,
        },
      });

      await tx.jobStatusHistory.create({
        data: {
          tenantId: input.tenantId,
          workOrderId: wo.id,
          fromStatus: null,
          toStatus: 'NEW',
          changedByUserId: input.actorUserId ?? null,
          reason: 'Work order created',
        },
      });

      return {
        ...wo,
        priority: wo.priority as JobPriority,
        status: wo.status as WorkOrderStatus,
      };
    });
  }

  async getWorkOrderDetails(
    tenantId: string,
    id: string,
  ): Promise<Awaited<ReturnType<WorkOrdersStore['getWorkOrderDetails']>>> {
    return withTenantTransaction(tenantId, async (tx) => {
      const wo = await tx.workOrder.findFirst({ where: { id, tenantId } });
      if (!wo) return null;

      const [assignments, visits, statusHistory, checklists, attachments, reports] = await Promise.all([
        tx.workOrderAssignment.findMany({ where: { tenantId, workOrderId: id } }),
        tx.workOrderVisit.findMany({ where: { tenantId, workOrderId: id }, orderBy: { visitNumber: 'asc' } }),
        tx.jobStatusHistory.findMany({ where: { tenantId, workOrderId: id }, orderBy: { changedAt: 'asc' } }),
        tx.jobChecklist.findMany({ where: { tenantId, workOrderId: id } }),
        tx.attachment.findMany({ where: { tenantId, entityType: 'WORK_ORDER', entityId: id } }),
        tx.jobReport.findMany({ where: { tenantId, workOrderId: id } }),
      ]);

      return {
        workOrder: {
          ...wo,
          priority: wo.priority as JobPriority,
          status: wo.status as WorkOrderStatus,
        },
        assignments,
        visits,
        statusHistory,
        checklists: checklists.map((c) => ({
          ...c,
          items: c.items as unknown as ChecklistItem[],
        })),
        attachments: attachments.map((a) => ({
          ...a,
          category: a.category as AttachmentCategory,
        })),
        reports,
      };
    });
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
  }): Promise<WorkOrderRecord | null> {
    return withTenantTransaction(input.tenantId, async (tx) => {
      const existing = await tx.workOrder.findFirst({
        where: { id: input.workOrderId, tenantId: input.tenantId },
      });
      if (!existing) return null;

      const updated = await tx.workOrder.update({
        where: { id: existing.id },
        data: {
          status: input.toStatus,
          version: { increment: 1 },
          ...(input.cancellationReason !== undefined ? { cancellationReason: input.cancellationReason } : {}),
          ...(input.technicianNotes !== undefined ? { technicianNotes: input.technicianNotes } : {}),
        },
      });

      await tx.jobStatusHistory.create({
        data: {
          tenantId: input.tenantId,
          workOrderId: existing.id,
          fromStatus: input.fromStatus,
          toStatus: input.toStatus,
          changedByUserId: input.actorUserId ?? null,
          reason: input.reason ?? null,
        },
      });

      return {
        ...updated,
        priority: updated.priority as JobPriority,
        status: updated.status as WorkOrderStatus,
      };
    });
  }

  async assignTechnicians(
    tenantId: string,
    workOrderId: string,
    assignments: Array<{ technicianUserId: string; isLead?: boolean }>,
  ): Promise<WorkOrderAssignmentRecord[]> {
    return withTenantTransaction(tenantId, async (tx) => {
      const created: WorkOrderAssignmentRecord[] = [];
      for (const item of assignments) {
        const rec = await tx.workOrderAssignment.create({
          data: {
            tenantId,
            workOrderId,
            technicianUserId: item.technicianUserId,
            isLead: item.isLead ?? false,
          },
        });
        created.push(rec);
      }
      return created;
    });
  }

  async addVisit(
    tenantId: string,
    workOrderId: string,
    input: { scheduledStartAt?: Date; scheduledEndAt?: Date; notes?: string },
  ): Promise<WorkOrderVisitRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const wo = await tx.workOrder.findFirst({ where: { id: workOrderId, tenantId } });
      if (!wo) return null;
      const count = await tx.workOrderVisit.count({ where: { tenantId, workOrderId } });
      return tx.workOrderVisit.create({
        data: {
          tenantId,
          workOrderId,
          visitNumber: count + 1,
          scheduledStartAt: input.scheduledStartAt ?? null,
          scheduledEndAt: input.scheduledEndAt ?? null,
          notes: input.notes ?? null,
        },
      });
    });
  }

  async createChecklist(
    tenantId: string,
    workOrderId: string,
    input: { title: string; items: ChecklistItem[] },
  ): Promise<JobChecklistRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const wo = await tx.workOrder.findFirst({ where: { id: workOrderId, tenantId } });
      if (!wo) return null;
      const cl = await tx.jobChecklist.create({
        data: {
          tenantId,
          workOrderId,
          title: input.title,
          items: input.items as unknown as Prisma.InputJsonValue,
          completedAt: input.items.every((i) => i.completed) ? new Date() : null,
        },
      });
      return { ...cl, items: cl.items as unknown as ChecklistItem[] };
    });
  }

  async updateChecklist(
    tenantId: string,
    workOrderId: string,
    checklistId: string,
    items: ChecklistItem[],
  ): Promise<JobChecklistRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const existing = await tx.jobChecklist.findFirst({
        where: { id: checklistId, workOrderId, tenantId },
      });
      if (!existing) return null;
      const updated = await tx.jobChecklist.update({
        where: { id: checklistId },
        data: {
          items: items as unknown as Prisma.InputJsonValue,
          completedAt: items.every((i) => i.completed) ? new Date() : null,
        },
      });
      return { ...updated, items: updated.items as unknown as ChecklistItem[] };
    });
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
  }): Promise<AttachmentRecord> {
    const att = await withTenantTransaction(input.tenantId, (tx) =>
      tx.attachment.create({ data: input }),
    );
    return { ...att, category: att.category as AttachmentCategory };
  }

  async approveAndCreateReport(input: {
    tenantId: string;
    workOrderId: string;
    summary: string;
    workPerformed: string;
    approvedByName?: string | null;
    customerApproved: boolean;
  }): Promise<JobReportRecord | null> {
    return withTenantTransaction(input.tenantId, async (tx) => {
      const wo = await tx.workOrder.findFirst({
        where: { id: input.workOrderId, tenantId: input.tenantId },
      });
      if (!wo) return null;
      if (input.customerApproved) {
        await tx.workOrder.update({
          where: { id: wo.id },
          data: { customerApprovedAt: new Date() },
        });
      }
      return tx.jobReport.create({
        data: {
          tenantId: input.tenantId,
          workOrderId: input.workOrderId,
          summary: input.summary,
          workPerformed: input.workPerformed,
          customerApproved: input.customerApproved,
          approvedByName: input.approvedByName ?? null,
        },
      });
    });
  }
}
