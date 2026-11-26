import type { ApiErrorResponse, ApiSuccessResponse, SystemRole, WorkOrderStatus } from '@servicegrid/types';

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ApiClientConfig {
  baseUrl: string;
  getAccessToken?: () => string | null;
  onAccessTokenRefreshed?: (accessToken: string) => void;
  onUnauthorized?: () => void;
  fetchImpl?: typeof fetch;
}

export interface AuthUserSummary {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  isActive: boolean;
  emailVerifiedAt: string | null;
  roles: SystemRole[];
}

export interface AuthSessionResponse {
  user: AuthUserSummary;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export interface CustomerRecordDto {
  id: string;
  tenantId: string;
  customerType: 'INDIVIDUAL' | 'BUSINESS';
  displayName: string;
  companyName: string | null;
  gstin: string | null;
  primaryPhone: string;
  primaryEmail: string | null;
  tags: string[];
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerContactDto {
  id: string;
  customerId: string;
  name: string;
  role: string | null;
  phone: string;
  email: string | null;
  isPrimary: boolean;
}

export interface CustomerAddressDto {
  id: string;
  customerId: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface CustomerProfileDto {
  customer: CustomerRecordDto;
  contacts: CustomerContactDto[];
  addresses: CustomerAddressDto[];
  assets: Array<{ id: string; category: string; brand: string | null; model: string | null; serialNumber: string | null }>;
  communications: Array<{ id: string; channel: string; summary: string; createdAt: string }>;
  timeline: Array<{ id: string; eventType: string; summary: string; createdAt: string }>;
}

export type JobPriorityDto = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface ServiceRequestDto {
  id: string;
  tenantId: string;
  customerId: string;
  assetId: string | null;
  requestNumber?: string;
  source: string;
  title: string;
  description: string;
  priority: JobPriorityDto;
  status: string;
  slaDueAt: string | null;
  convertedWorkOrderId: string | null;
  createdAt: string;
}

export interface WorkOrderDto {
  id: string;
  tenantId: string;
  customerId: string;
  assetId: string | null;
  serviceRequestId: string | null;
  jobNumber: string;
  title: string;
  description: string | null;
  priority: JobPriorityDto;
  status: WorkOrderStatus;
  technicianNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderDetailsDto {
  workOrder: WorkOrderDto;
  assignments: Array<{ id: string; technicianUserId: string; isLead: boolean }>;
  visits: Array<{ id: string; visitNumber: number; scheduledStartAt: string | null; scheduledEndAt: string | null; notes: string | null; status: string }>;
  checklists: Array<{ id: string; title: string; items: Array<{ label: string; completed: boolean }> }>;
  attachments: Array<{ id: string; category: string; fileName: string; fileUrl: string }>;
  statusHistory: Array<{ id: string; fromStatus: string | null; toStatus: string; reason: string | null; changedAt: string }>;
}

export interface DashboardMetricsDto {
  totalCustomers: number;
  openServiceRequests: number;
  activeWorkOrders: number;
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  revenue: string;
  outstandingPayments: string;
  firstTimeFixRate: number;
  customerSatisfaction: number | null;
  inventoryConsumption: number;
  contractRenewalsDue: number;
  recentActivity: Array<{
    id: string;
    type: 'WORK_ORDER' | 'SERVICE_REQUEST';
    title: string;
    status: string;
    priority: string;
    timestamp: string;
  }>;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getAccessToken?: () => string | null;
  private readonly onAccessTokenRefreshed?: (accessToken: string) => void;
  private readonly onUnauthorized?: () => void;
  private readonly fetchImpl: typeof fetch;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getAccessToken = config.getAccessToken;
    this.onAccessTokenRefreshed = config.onAccessTokenRefreshed;
    this.onUnauthorized = config.onUnauthorized;
    this.fetchImpl = config.fetchImpl ?? ((...args) => fetch(...args));
  }

  private async tryRefreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = (async () => {
      try {
        const res = await this.fetchImpl(`${this.baseUrl}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!res.ok) return null;
        const body = (await res.json()) as ApiSuccessResponse<{ accessToken: string }>;
        if (!body.success || !body.data?.accessToken) return null;
        this.onAccessTokenRefreshed?.(body.data.accessToken);
        return body.data.accessToken;
      } catch {
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();
    return this.refreshPromise;
  }

  async request<T>(
    path: string,
    options: RequestInit & { idempotencyKey?: string; skipAuthRefresh?: boolean } = {},
  ): Promise<ApiSuccessResponse<T>> {
    const execute = async (overrideToken?: string | null) => {
      const headers = new Headers(options.headers);
      if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
      }

      const token = overrideToken !== undefined ? overrideToken : this.getAccessToken?.();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (options.idempotencyKey) {
        headers.set('Idempotency-Key', options.idempotencyKey);
      }

      return this.fetchImpl(`${this.baseUrl}/api/v1${path}`, {
        ...options,
        credentials: options.credentials ?? 'include',
        headers,
      });
    };

    let response = await execute();

    if (response.status === 401 && !options.skipAuthRefresh && !path.startsWith('/auth/refresh')) {
      const refreshedToken = await this.tryRefreshAccessToken();
      if (refreshedToken) {
        response = await execute(refreshedToken);
      } else {
        this.onUnauthorized?.();
      }
    }

    let body: ApiSuccessResponse<T> | ApiErrorResponse | null = null;
    const text = await response.text();
    if (text) {
      try {
        body = JSON.parse(text) as ApiSuccessResponse<T> | ApiErrorResponse;
      } catch {
        body = null;
      }
    }

    if (!response.ok || !body || !body.success) {
      const err = body && !body.success
        ? body.error
        : { code: `HTTP_${response.status}`, message: response.statusText || 'Request failed' };
      throw new ApiClientError(response.status, err.code, err.message, err.details);
    }
    return body;
  }

  // Auth
  login(input: { email: string; password: string }) {
    return this.request<AuthSessionResponse>('/auth/login', {
      method: 'POST',
      skipAuthRefresh: true,
      body: JSON.stringify(input),
    });
  }

  register(input: {
    organizationName: string;
    fullName: string;
    email: string;
    password: string;
    timezone?: string;
    currency?: string;
  }) {
    return this.request<AuthSessionResponse & { tenant: { id: string; name: string } }>('/auth/register', {
      method: 'POST',
      skipAuthRefresh: true,
      body: JSON.stringify(input),
    });
  }

  refresh(refreshToken?: string) {
    return this.request<AuthSessionResponse>('/auth/refresh', {
      method: 'POST',
      skipAuthRefresh: true,
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });
  }

  logout() {
    return this.request<{ revoked: boolean }>('/auth/logout', {
      method: 'POST',
      skipAuthRefresh: true,
    });
  }

  me() {
    return this.request<{ user: AuthUserSummary; tenant: { id: string; name: string; currency: string; timezone: string } }>('/auth/me');
  }

  forgotPassword(email: string) {
    return this.request<{ message: string; resetToken?: string }>('/auth/forgot-password', {
      method: 'POST',
      skipAuthRefresh: true,
      body: JSON.stringify({ email }),
    });
  }

  resetPassword(token: string, newPassword: string) {
    return this.request<{ reset: boolean }>('/auth/reset-password', {
      method: 'POST',
      skipAuthRefresh: true,
      body: JSON.stringify({ token, newPassword }),
    });
  }

  // Dashboard
  getDashboardMetrics() {
    return this.request<DashboardMetricsDto>('/analytics/dashboard');
  }

  // Customers
  listCustomers(params: { search?: string; customerType?: 'INDIVIDUAL' | 'BUSINESS'; page?: number; limit?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.customerType) qs.set('customerType', params.customerType);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<CustomerRecordDto[]>(`/customers${suffix}`);
  }

  getCustomer(id: string) {
    return this.request<CustomerProfileDto>(`/customers/${id}`);
  }

  createCustomer(input: {
    customerType?: 'INDIVIDUAL' | 'BUSINESS';
    displayName: string;
    companyName?: string;
    gstin?: string;
    primaryPhone: string;
    primaryEmail?: string;
    tags?: string[];
    notes?: string;
  }) {
    return this.request<CustomerRecordDto>('/customers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  updateCustomer(
    id: string,
    input: Partial<{
      displayName: string;
      companyName: string;
      gstin: string;
      primaryPhone: string;
      primaryEmail: string;
      tags: string[];
      notes: string;
      isActive: boolean;
    }>,
  ) {
    return this.request<CustomerRecordDto>(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  addCustomerContact(
    customerId: string,
    input: { name: string; role?: string; phone: string; email?: string; isPrimary?: boolean },
  ) {
    return this.request<CustomerContactDto>(`/customers/${customerId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  deleteCustomerContact(customerId: string, contactId: string) {
    return this.request<{ deleted: boolean }>(`/customers/${customerId}/contacts/${contactId}`, {
      method: 'DELETE',
    });
  }

  addCustomerAddress(
    customerId: string,
    input: {
      label?: string;
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country?: string;
      isDefault?: boolean;
    },
  ) {
    return this.request<CustomerAddressDto>(`/customers/${customerId}/addresses`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // Service Requests
  listServiceRequests(params: { status?: string; priority?: JobPriorityDto; search?: string } = {}) {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.priority) qs.set('priority', params.priority);
    if (params.search) qs.set('search', params.search);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<ServiceRequestDto[]>(`/service-requests${suffix}`);
  }

  createServiceRequest(input: {
    customerId: string;
    assetId?: string;
    categoryId?: string;
    title: string;
    description: string;
    priority?: JobPriorityDto;
  }) {
    return this.request<ServiceRequestDto>('/service-requests', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  convertServiceRequest(id: string) {
    return this.request<WorkOrderDto>(`/service-requests/${id}/convert`, {
      method: 'POST',
    });
  }

  // Work Orders
  listWorkOrders(params: { status?: WorkOrderStatus; priority?: JobPriorityDto; search?: string } = {}) {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.priority) qs.set('priority', params.priority);
    if (params.search) qs.set('search', params.search);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<WorkOrderDto[]>(`/work-orders${suffix}`);
  }

  getWorkOrder(id: string) {
    return this.request<WorkOrderDetailsDto>(`/work-orders/${id}`);
  }

  createWorkOrder(input: {
    customerId: string;
    assetId?: string;
    title: string;
    description?: string;
    priority?: JobPriorityDto;
  }) {
    return this.request<WorkOrderDto>('/work-orders', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  assignWorkOrder(id: string, assignments: Array<{ technicianUserId: string; isLead?: boolean }>) {
    return this.request<unknown>(`/work-orders/${id}/assignments`, {
      method: 'POST',
      body: JSON.stringify({ assignments }),
    });
  }

  addWorkOrderVisit(id: string, input: { scheduledStartAt?: string; scheduledEndAt?: string; notes?: string }) {
    return this.request<unknown>(`/work-orders/${id}/visits`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  transitionWorkOrderStatus(id: string, input: { status: WorkOrderStatus; reason?: string; technicianNotes?: string }) {
    return this.request<WorkOrderDto>(`/work-orders/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }
}
