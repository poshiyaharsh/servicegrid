import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { WorkOrderStatus } from '@servicegrid/types';
import { assertValidTransition } from './work-order-state-machine';
import {
  WORK_ORDERS_STORE,
  type AttachmentCategory,
  type ChecklistItem,
  type JobPriority,
  type WorkOrdersStore,
} from './work-orders.store';

@Injectable()
export class WorkOrdersService {
  constructor(@Inject(WORK_ORDERS_STORE) private readonly store: WorkOrdersStore) {}

  async list(tenantId: string, status?: WorkOrderStatus) {
    return this.store.listWorkOrders(tenantId, status);
  }

  async create(
    tenantId: string,
    actorUserId: string,
    input: {
      branchId?: string;
      customerId: string;
      assetId?: string;
      title: string;
      description?: string;
      priority?: JobPriority;
    },
  ) {
    const jobNumber = `JOB-${Date.now().toString(36).toUpperCase()}`;
    return this.store.createWorkOrder({
      tenantId,
      branchId: input.branchId ?? null,
      customerId: input.customerId,
      assetId: input.assetId ?? null,
      jobNumber,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? 'MEDIUM',
      actorUserId,
    });
  }

  async getDetails(tenantId: string, id: string) {
    const details = await this.store.getWorkOrderDetails(tenantId, id);
    if (!details) throw new NotFoundException('Work order not found');
    return details;
  }

  async transitionStatus(
    tenantId: string,
    workOrderId: string,
    actorUserId: string,
    input: { status: WorkOrderStatus; reason?: string; technicianNotes?: string },
  ) {
    const details = await this.store.getWorkOrderDetails(tenantId, workOrderId);
    if (!details) throw new NotFoundException('Work order not found');

    assertValidTransition(details.workOrder.status, input.status);
    return this.store.updateWorkOrderStatus({
      tenantId,
      workOrderId,
      fromStatus: details.workOrder.status,
      toStatus: input.status,
      actorUserId,
      reason: input.reason ?? null,
      technicianNotes: input.technicianNotes,
    });
  }

  async cancel(tenantId: string, workOrderId: string, actorUserId: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('Cancellation reason is required');
    const details = await this.store.getWorkOrderDetails(tenantId, workOrderId);
    if (!details) throw new NotFoundException('Work order not found');

    assertValidTransition(details.workOrder.status, 'CANCELLED');
    return this.store.updateWorkOrderStatus({
      tenantId,
      workOrderId,
      fromStatus: details.workOrder.status,
      toStatus: 'CANCELLED',
      actorUserId,
      reason: `Cancelled: ${reason}`,
      cancellationReason: reason,
    });
  }

  async reopen(tenantId: string, workOrderId: string, actorUserId: string, reason: string) {
    if (!reason?.trim()) throw new BadRequestException('Reopen reason is required');
    const details = await this.store.getWorkOrderDetails(tenantId, workOrderId);
    if (!details) throw new NotFoundException('Work order not found');

    assertValidTransition(details.workOrder.status, 'PENDING');
    return this.store.updateWorkOrderStatus({
      tenantId,
      workOrderId,
      fromStatus: details.workOrder.status,
      toStatus: 'PENDING',
      actorUserId,
      reason: `Reopened: ${reason}`,
    });
  }

  async assignTechnicians(
    tenantId: string,
    workOrderId: string,
    actorUserId: string,
    assignments: Array<{ technicianUserId: string; isLead?: boolean }>,
  ) {
    const details = await this.store.getWorkOrderDetails(tenantId, workOrderId);
    if (!details) throw new NotFoundException('Work order not found');
    if (assignments.length === 0) throw new BadRequestException('At least one technician is required');

    const created = await this.store.assignTechnicians(tenantId, workOrderId, assignments);
    if (details.workOrder.status === 'NEW' || details.workOrder.status === 'PENDING' || details.workOrder.status === 'SCHEDULED') {
      assertValidTransition(details.workOrder.status, 'ASSIGNED');
      await this.store.updateWorkOrderStatus({
        tenantId,
        workOrderId,
        fromStatus: details.workOrder.status,
        toStatus: 'ASSIGNED',
        actorUserId,
        reason: 'Technicians assigned',
      });
    }
    return created;
  }

  async addVisit(
    tenantId: string,
    workOrderId: string,
    input: { scheduledStartAt?: string; scheduledEndAt?: string; notes?: string },
  ) {
    const visit = await this.store.addVisit(tenantId, workOrderId, {
      scheduledStartAt: input.scheduledStartAt ? new Date(input.scheduledStartAt) : undefined,
      scheduledEndAt: input.scheduledEndAt ? new Date(input.scheduledEndAt) : undefined,
      notes: input.notes,
    });
    if (!visit) throw new NotFoundException('Work order not found');
    return visit;
  }

  async createChecklist(
    tenantId: string,
    workOrderId: string,
    input: { title: string; items: ChecklistItem[] },
  ) {
    const cl = await this.store.createChecklist(tenantId, workOrderId, input);
    if (!cl) throw new NotFoundException('Work order not found');
    return cl;
  }

  async updateChecklist(
    tenantId: string,
    workOrderId: string,
    checklistId: string,
    items: ChecklistItem[],
  ) {
    const cl = await this.store.updateChecklist(tenantId, workOrderId, checklistId, items);
    if (!cl) throw new NotFoundException('Checklist not found');
    return cl;
  }

  async addAttachment(
    tenantId: string,
    workOrderId: string,
    actorUserId: string,
    input: { category: AttachmentCategory; fileName: string; mimeType: string; storageKey: string },
  ) {
    const details = await this.store.getWorkOrderDetails(tenantId, workOrderId);
    if (!details) throw new NotFoundException('Work order not found');
    return this.store.addAttachment({
      tenantId,
      entityType: 'WORK_ORDER',
      entityId: workOrderId,
      uploadedByUserId: actorUserId,
      ...input,
    });
  }

  async approveAndReport(
    tenantId: string,
    workOrderId: string,
    input: { summary: string; workPerformed: string; approvedByName?: string; customerApproved: boolean },
  ) {
    const report = await this.store.approveAndCreateReport({
      tenantId,
      workOrderId,
      ...input,
    });
    if (!report) throw new NotFoundException('Work order not found');
    return report;
  }
}
