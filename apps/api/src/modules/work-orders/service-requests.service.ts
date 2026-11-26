import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  WORK_ORDERS_STORE,
  type JobPriority,
  type RequestSource,
  type WorkOrdersStore,
} from './work-orders.store';

@Injectable()
export class ServiceRequestsService {
  constructor(@Inject(WORK_ORDERS_STORE) private readonly store: WorkOrdersStore) {}

  async listCategories(tenantId: string) {
    return this.store.listCategories(tenantId);
  }

  async createCategory(
    tenantId: string,
    input: { name: string; code: string; defaultSlaHours?: number },
  ) {
    if (!input.name?.trim() || !input.code?.trim()) {
      throw new BadRequestException('Category name and code are required');
    }
    return this.store.createCategory({
      tenantId,
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      defaultSlaHours: input.defaultSlaHours ?? 24,
    });
  }

  async listRequests(tenantId: string, status?: string) {
    return this.store.listServiceRequests(tenantId, status);
  }

  async createRequest(
    tenantId: string,
    actorUserId: string,
    source: RequestSource,
    input: {
      branchId?: string;
      customerId: string;
      assetId?: string;
      categoryId?: string;
      title: string;
      description: string;
      priority?: JobPriority;
    },
  ) {
    let slaHours = 24;
    if (input.categoryId) {
      const cat = await this.store.findCategoryById(tenantId, input.categoryId);
      if (cat) slaHours = cat.defaultSlaHours;
    }
    if (input.priority === 'URGENT') slaHours = Math.min(slaHours, 4);
    else if (input.priority === 'HIGH') slaHours = Math.min(slaHours, 8);

    const slaDueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);
    return this.store.createServiceRequest({
      tenantId,
      branchId: input.branchId ?? null,
      customerId: input.customerId,
      assetId: input.assetId ?? null,
      categoryId: input.categoryId ?? null,
      source,
      title: input.title,
      description: input.description,
      priority: input.priority ?? 'MEDIUM',
      slaDueAt,
      createdByUserId: actorUserId,
    });
  }

  async convertToWorkOrder(tenantId: string, requestId: string, actorUserId: string) {
    const req = await this.store.findServiceRequestById(tenantId, requestId);
    if (!req) throw new NotFoundException('Service request not found');
    if (req.status === 'CONVERTED') {
      throw new BadRequestException('Service request has already been converted');
    }

    const jobNumber = `JOB-${Date.now().toString(36).toUpperCase()}`;
    const wo = await this.store.createWorkOrder({
      tenantId,
      branchId: req.branchId,
      serviceRequestId: req.id,
      customerId: req.customerId,
      assetId: req.assetId,
      jobNumber,
      title: req.title,
      description: req.description,
      priority: req.priority,
      slaDueAt: req.slaDueAt,
      actorUserId,
    });

    await this.store.markRequestConverted(tenantId, req.id);
    return wo;
  }
}
