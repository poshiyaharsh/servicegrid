import { Injectable } from '@nestjs/common';
import { withTenantTransaction, type Prisma } from '@servicegrid/database';
import type { WorkingHoursWindow } from './dispatch.engine';
import type {
  AppointmentRecord,
  DispatchStore,
  LeaveRecord,
  TechnicianRecord,
} from './dispatch.store';

@Injectable()
export class PrismaDispatchStore implements DispatchStore {
  async listTechnicians(tenantId: string): Promise<TechnicianRecord[]> {
    return withTenantTransaction(tenantId, async (tx) => {
      const rows = await tx.technician.findMany({
        where: { tenantId },
        include: { skills: true },
      });
      return rows.map((t) => ({
        id: t.id,
        tenantId: t.tenantId,
        userId: t.userId,
        branchId: t.branchId,
        displayName: t.displayName,
        phone: t.phone,
        homeLat: t.homeLat ? Number(t.homeLat) : null,
        homeLng: t.homeLng ? Number(t.homeLng) : null,
        workingHours: t.workingHours as unknown as WorkingHoursWindow,
        skills: t.skills.map((s) => s.skillCode),
        isActive: t.isActive,
      }));
    });
  }

  async findTechnicianById(tenantId: string, technicianId: string): Promise<TechnicianRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const t = await tx.technician.findFirst({
        where: { id: technicianId, tenantId },
        include: { skills: true },
      });
      if (!t) return null;
      return {
        id: t.id,
        tenantId: t.tenantId,
        userId: t.userId,
        branchId: t.branchId,
        displayName: t.displayName,
        phone: t.phone,
        homeLat: t.homeLat ? Number(t.homeLat) : null,
        homeLng: t.homeLng ? Number(t.homeLng) : null,
        workingHours: t.workingHours as unknown as WorkingHoursWindow,
        skills: t.skills.map((s) => s.skillCode),
        isActive: t.isActive,
      };
    });
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
  }): Promise<TechnicianRecord> {
    return withTenantTransaction(input.tenantId, async (tx) => {
      const tech = await tx.technician.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          branchId: input.branchId ?? null,
          displayName: input.displayName,
          phone: input.phone,
          homeLat: input.homeLat ?? null,
          homeLng: input.homeLng ?? null,
          workingHours: input.workingHours as unknown as Prisma.InputJsonValue,
        },
      });
      if (input.skills.length > 0) {
        await tx.technicianSkill.createMany({
          data: input.skills.map((skillCode) => ({
            tenantId: input.tenantId,
            technicianId: tech.id,
            skillCode,
          })),
        });
      }
      return {
        id: tech.id,
        tenantId: tech.tenantId,
        userId: tech.userId,
        branchId: tech.branchId,
        displayName: tech.displayName,
        phone: tech.phone,
        homeLat: tech.homeLat ? Number(tech.homeLat) : null,
        homeLng: tech.homeLng ? Number(tech.homeLng) : null,
        workingHours: input.workingHours,
        skills: input.skills,
        isActive: tech.isActive,
      };
    });
  }

  async listLeaves(tenantId: string, technicianId?: string): Promise<LeaveRecord[]> {
    const rows = await withTenantTransaction(tenantId, (tx) =>
      tx.technicianLeave.findMany({
        where: { tenantId, ...(technicianId ? { technicianId } : {}) },
      }),
    );
    return rows.map((l) => ({ ...l, status: l.status as LeaveRecord['status'] }));
  }

  async createLeave(input: {
    tenantId: string;
    technicianId: string;
    startAt: Date;
    endAt: Date;
    reason?: string | null;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  }): Promise<LeaveRecord> {
    const row = await withTenantTransaction(input.tenantId, (tx) =>
      tx.technicianLeave.create({
        data: {
          tenantId: input.tenantId,
          technicianId: input.technicianId,
          startAt: input.startAt,
          endAt: input.endAt,
          reason: input.reason ?? null,
          status: input.status ?? 'APPROVED',
        },
      }),
    );
    return { ...row, status: row.status as LeaveRecord['status'] };
  }

  async listAppointments(
    tenantId: string,
    range?: { from?: Date; to?: Date },
  ): Promise<AppointmentRecord[]> {
    const rows = await withTenantTransaction(tenantId, (tx) =>
      tx.appointment.findMany({
        where: {
          tenantId,
          ...(range?.from ? { endAt: { gte: range.from } } : {}),
          ...(range?.to ? { startAt: { lte: range.to } } : {}),
        },
        orderBy: { startAt: 'asc' },
      }),
    );
    return rows.map((a) => ({ ...a, status: a.status as AppointmentRecord['status'] }));
  }

  async findAppointmentById(tenantId: string, id: string): Promise<AppointmentRecord | null> {
    const row = await withTenantTransaction(tenantId, (tx) =>
      tx.appointment.findFirst({ where: { id, tenantId } }),
    );
    if (!row) return null;
    return { ...row, status: row.status as AppointmentRecord['status'] };
  }

  async createAppointment(input: Omit<AppointmentRecord, 'id'>): Promise<AppointmentRecord> {
    const row = await withTenantTransaction(input.tenantId, (tx) =>
      tx.appointment.create({ data: input }),
    );
    return { ...row, status: row.status as AppointmentRecord['status'] };
  }

  async updateAppointmentStatus(
    tenantId: string,
    appointmentId: string,
    status: AppointmentRecord['status'],
  ): Promise<AppointmentRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const existing = await tx.appointment.findFirst({ where: { id: appointmentId, tenantId } });
      if (!existing) return null;
      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: { status },
      });
      return { ...updated, status: updated.status as AppointmentRecord['status'] };
    });
  }
}
