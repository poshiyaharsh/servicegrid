import crypto from 'node:crypto';
import type { WorkingHoursWindow } from './dispatch.engine';
import type {
  AppointmentRecord,
  DispatchStore,
  LeaveRecord,
  TechnicianRecord,
} from './dispatch.store';

export class InMemoryDispatchStore implements DispatchStore {
  private technicians = new Map<string, TechnicianRecord>();
  private leaves = new Map<string, LeaveRecord>();
  private appointments = new Map<string, AppointmentRecord>();

  async listTechnicians(tenantId: string) {
    return [...this.technicians.values()].filter((t) => t.tenantId === tenantId);
  }

  async findTechnicianById(tenantId: string, technicianId: string) {
    const t = this.technicians.get(technicianId);
    return t && t.tenantId === tenantId ? t : null;
  }

  async createTechnician(input: {
    tenantId: string;
    userId: string;
    branchId?: string | null;
    displayName: string;
    phone: string;
    homeLat?: number | null;
    homeLng?: number | null;
    workingHours: WorkingHoursWindow;
    skills: string[];
  }) {
    const rec: TechnicianRecord = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      userId: input.userId,
      branchId: input.branchId ?? null,
      displayName: input.displayName,
      phone: input.phone,
      homeLat: input.homeLat ?? null,
      homeLng: input.homeLng ?? null,
      workingHours: input.workingHours,
      skills: input.skills,
      isActive: true,
    };
    this.technicians.set(rec.id, rec);
    return rec;
  }

  async listLeaves(tenantId: string, technicianId?: string) {
    return [...this.leaves.values()].filter(
      (l) => l.tenantId === tenantId && (!technicianId || l.technicianId === technicianId),
    );
  }

  async createLeave(input: {
    tenantId: string;
    technicianId: string;
    startAt: Date;
    endAt: Date;
    reason?: string | null;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  }) {
    const rec: LeaveRecord = {
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      technicianId: input.technicianId,
      startAt: input.startAt,
      endAt: input.endAt,
      reason: input.reason ?? null,
      status: input.status ?? 'APPROVED',
    };
    this.leaves.set(rec.id, rec);
    return rec;
  }

  async listAppointments(tenantId: string, range?: { from?: Date; to?: Date }) {
    return [...this.appointments.values()].filter((a) => {
      if (a.tenantId !== tenantId) return false;
      if (range?.from && a.endAt < range.from) return false;
      if (range?.to && a.startAt > range.to) return false;
      return true;
    });
  }

  async findAppointmentById(tenantId: string, id: string) {
    const a = this.appointments.get(id);
    return a && a.tenantId === tenantId ? a : null;
  }

  async createAppointment(input: Omit<AppointmentRecord, 'id'>) {
    const rec: AppointmentRecord = { id: crypto.randomUUID(), ...input };
    this.appointments.set(rec.id, rec);
    return rec;
  }

  async updateAppointmentStatus(
    tenantId: string,
    appointmentId: string,
    status: AppointmentRecord['status'],
  ) {
    const a = await this.findAppointmentById(tenantId, appointmentId);
    if (!a) return null;
    const updated = { ...a, status };
    this.appointments.set(appointmentId, updated);
    return updated;
  }
}
