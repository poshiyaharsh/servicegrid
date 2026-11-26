import type { WorkOrderStatus } from '@servicegrid/types';

export type JobPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type RequestSource = 'MANUAL' | 'PORTAL' | 'WHATSAPP' | 'VOICE';
export type AttachmentCategory = 'COMPLAINT' | 'BEFORE_PHOTO' | 'AFTER_PHOTO' | 'SIGNATURE' | 'REPORT';

export interface RequestCategoryRecord {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  defaultSlaHours: number;
  isActive: boolean;
}

export interface ServiceRequestRecord {
  id: string;
  tenantId: string;
  branchId: string | null;
  customerId: string;
  assetId: string | null;
  categoryId: string | null;
  source: RequestSource;
  title: string;
  description: string;
  priority: JobPriority;
  status: string;
  slaDueAt: Date | null;
  createdByUserId: string | null;
  createdAt: Date;
}

export interface WorkOrderRecord {
  id: string;
  tenantId: string;
  branchId: string | null;
  serviceRequestId: string | null;
  customerId: string;
  assetId: string | null;
  jobNumber: string;
  title: string;
  description: string | null;
  priority: JobPriority;
  status: WorkOrderStatus;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  slaDueAt: Date | null;
  technicianNotes: string | null;
  customerApprovedAt: Date | null;
  cancellationReason: string | null;
  version: number;
  createdAt: Date;
}

export interface WorkOrderAssignmentRecord {
  id: string;
  tenantId: string;
  workOrderId: string;
  technicianUserId: string;
  isLead: boolean;
  assignedAt: Date;
}

export interface WorkOrderVisitRecord {
  id: string;
  tenantId: string;
  workOrderId: string;
  visitNumber: number;
  scheduledStartAt: Date | null;
  scheduledEndAt: Date | null;
  status: string;
  notes: string | null;
}

export interface JobStatusHistoryRecord {
  id: string;
  tenantId: string;
  workOrderId: string;
  fromStatus: string | null;
  toStatus: string;
  changedByUserId: string | null;
  reason: string | null;
  changedAt: Date;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  notes?: string;
}

export interface JobChecklistRecord {
  id: string;
  tenantId: string;
  workOrderId: string;
  title: string;
  items: ChecklistItem[];
  completedAt: Date | null;
}

export interface AttachmentRecord {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  category: AttachmentCategory;
  fileName: string;
  mimeType: string;
  storageKey: string;
  uploadedByUserId: string | null;
  createdAt: Date;
}

export interface JobReportRecord {
  id: string;
  tenantId: string;
  workOrderId: string;
  summary: string;
  workPerformed: string;
  customerApproved: boolean;
  approvedByName: string | null;
  generatedAt: Date;
}

export const WORK_ORDERS_STORE = Symbol('WORK_ORDERS_STORE');

export interface WorkOrdersStore {
  listCategories(tenantId: string): Promise<RequestCategoryRecord[]>;
  createCategory(input: {
    tenantId: string;
    name: string;
    code: string;
    defaultSlaHours: number;
  }): Promise<RequestCategoryRecord>;
  findCategoryById(tenantId: string, categoryId: string): Promise<RequestCategoryRecord | null>;

  listServiceRequests(tenantId: string, status?: string): Promise<ServiceRequestRecord[]>;
  createServiceRequest(input: {
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
  }): Promise<ServiceRequestRecord>;
  findServiceRequestById(tenantId: string, id: string): Promise<ServiceRequestRecord | null>;
  markRequestConverted(tenantId: string, id: string): Promise<void>;

  listWorkOrders(tenantId: string, status?: WorkOrderStatus): Promise<WorkOrderRecord[]>;
  createWorkOrder(input: {
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
  }): Promise<WorkOrderRecord>;
  getWorkOrderDetails(tenantId: string, id: string): Promise<{
    workOrder: WorkOrderRecord;
    assignments: WorkOrderAssignmentRecord[];
    visits: WorkOrderVisitRecord[];
    statusHistory: JobStatusHistoryRecord[];
    checklists: JobChecklistRecord[];
    attachments: AttachmentRecord[];
    reports: JobReportRecord[];
  } | null>;
  updateWorkOrderStatus(input: {
    tenantId: string;
    workOrderId: string;
    fromStatus: WorkOrderStatus;
    toStatus: WorkOrderStatus;
    actorUserId?: string | null;
    reason?: string | null;
    cancellationReason?: string | null;
    technicianNotes?: string | null;
  }): Promise<WorkOrderRecord | null>;
  assignTechnicians(
    tenantId: string,
    workOrderId: string,
    assignments: Array<{ technicianUserId: string; isLead?: boolean }>,
  ): Promise<WorkOrderAssignmentRecord[]>;
  addVisit(
    tenantId: string,
    workOrderId: string,
    input: { scheduledStartAt?: Date; scheduledEndAt?: Date; notes?: string },
  ): Promise<WorkOrderVisitRecord | null>;
  createChecklist(
    tenantId: string,
    workOrderId: string,
    input: { title: string; items: ChecklistItem[] },
  ): Promise<JobChecklistRecord | null>;
  updateChecklist(
    tenantId: string,
    workOrderId: string,
    checklistId: string,
    items: ChecklistItem[],
  ): Promise<JobChecklistRecord | null>;
  addAttachment(input: {
    tenantId: string;
    entityType: string;
    entityId: string;
    category: AttachmentCategory;
    fileName: string;
    mimeType: string;
    storageKey: string;
    uploadedByUserId?: string | null;
  }): Promise<AttachmentRecord>;
  approveAndCreateReport(input: {
    tenantId: string;
    workOrderId: string;
    summary: string;
    workPerformed: string;
    approvedByName?: string | null;
    customerApproved: boolean;
  }): Promise<JobReportRecord | null>;
}
