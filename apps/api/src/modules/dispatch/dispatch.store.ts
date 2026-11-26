import type { WorkingHoursWindow } from './dispatch.engine';

export interface TechnicianRecord {
  id: string;
  tenantId: string;
  userId: string;
  branchId: string | null;
  displayName: string;
  phone: string;
  homeLat: number | null;
  homeLng: number | null;
  workingHours: WorkingHoursWindow;
  skills: string[];
  isActive: boolean;
}

export interface LeaveRecord {
  id: string;
  tenantId: string;
  technicianId: string;
  startAt: Date;
  endAt: Date;
  reason: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface AppointmentRecord {
  id: string;
  tenantId: string;
  workOrderId: string;
  technicianId: string;
  startAt: Date;
  endAt: Date;
  estimatedDurationMinutes: number;
  estimatedTravelMinutes: number;
  status: 'SCHEDULED' | 'REASSIGNED' | 'CANCELLED' | 'COMPLETED';
}

export const DISPATCH_STORE = Symbol('DISPATCH_STORE');

export interface DispatchStore {
  listTechnicians(tenantId: string): Promise<TechnicianRecord[]>;
  findTechnicianById(tenantId: string, technicianId: string): Promise<TechnicianRecord | null>;
  createTechnician(input: {
    tenantId: string;
    userId: string;
    branchId?: string | null;
    displayName: string;
    phone: string;
    homeLat?: number | null;
    homeLng?: number | null;
    workingHours: WorkingHoursWindow;
    skills: string[];
  }): Promise<TechnicianRecord>;

  listLeaves(tenantId: string, technicianId?: string): Promise<LeaveRecord[]>;
  createLeave(input: {
    tenantId: string;
    technicianId: string;
    startAt: Date;
    endAt: Date;
    reason?: string | null;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  }): Promise<LeaveRecord>;

  listAppointments(tenantId: string, range?: { from?: Date; to?: Date }): Promise<AppointmentRecord[]>;
  findAppointmentById(tenantId: string, id: string): Promise<AppointmentRecord | null>;
  createAppointment(input: Omit<AppointmentRecord, 'id'>): Promise<AppointmentRecord>;
  updateAppointmentStatus(
    tenantId: string,
    appointmentId: string,
    status: AppointmentRecord['status'],
  ): Promise<AppointmentRecord | null>;
}
