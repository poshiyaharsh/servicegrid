export type SystemRole =
  | 'PLATFORM_SUPER_ADMIN'
  | 'ORGANIZATION_OWNER'
  | 'ORGANIZATION_ADMIN'
  | 'OPERATIONS_MANAGER'
  | 'DISPATCHER'
  | 'TECHNICIAN'
  | 'ACCOUNTANT'
  | 'INVENTORY_MANAGER'
  | 'CUSTOMER';

export type WorkOrderStatus =
  | 'NEW'
  | 'PENDING'
  | 'SCHEDULED'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

export interface TenantContext {
  tenantId: string;
  userId: string;
  branchId?: string | null;
  roles: SystemRole[];
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    requestId?: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}
