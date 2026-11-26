import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  checkTechnicianAvailability,
  estimateTravelMinutes,
  optimizeRoute,
  scoreTechnicianForJob,
  type RouteStop,
  type WorkingHoursWindow,
} from './dispatch.engine';
import { DISPATCH_STORE, type DispatchStore } from './dispatch.store';

@Injectable()
export class DispatchService {
  constructor(@Inject(DISPATCH_STORE) private readonly store: DispatchStore) {}

  async listTechnicians(tenantId: string) {
    return this.store.listTechnicians(tenantId);
  }

  async createTechnician(
    tenantId: string,
    input: {
      userId: string;
      branchId?: string;
      displayName: string;
      phone: string;
      homeLat?: number;
      homeLng?: number;
      workingHours?: WorkingHoursWindow;
      skills?: string[];
    },
  ) {
    return this.store.createTechnician({
      tenantId,
      userId: input.userId,
      branchId: input.branchId ?? null,
      displayName: input.displayName,
      phone: input.phone,
      homeLat: input.homeLat ?? null,
      homeLng: input.homeLng ?? null,
      workingHours: input.workingHours ?? { startHour: 8, endHour: 20 },
      skills: input.skills ?? [],
    });
  }

  async addLeave(
    tenantId: string,
    technicianId: string,
    input: { startAt: string; endAt: string; reason?: string; status?: 'PENDING' | 'APPROVED' | 'REJECTED' },
  ) {
    const tech = await this.store.findTechnicianById(tenantId, technicianId);
    if (!tech) throw new NotFoundException('Technician not found');
    return this.store.createLeave({
      tenantId,
      technicianId,
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      reason: input.reason ?? null,
      status: input.status ?? 'APPROVED',
    });
  }

  async getBoard(tenantId: string, view: 'daily' | 'weekly' | 'monthly', anchorDateIso?: string) {
    const anchor = anchorDateIso ? new Date(anchorDateIso) : new Date();
    const from = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate()));
    const to = new Date(from);

    if (view === 'daily') {
      to.setUTCDate(to.getUTCDate() + 1);
    } else if (view === 'weekly') {
      to.setUTCDate(to.getUTCDate() + 7);
    } else {
      to.setUTCMonth(to.getUTCMonth() + 1);
    }

    const [technicians, appointments] = await Promise.all([
      this.store.listTechnicians(tenantId),
      this.store.listAppointments(tenantId, { from, to }),
    ]);

    return { view, range: { from, to }, technicians, appointments };
  }

  async recommendTechnicians(
    tenantId: string,
    input: {
      startAt: string;
      endAt: string;
      requiredSkills?: string[];
      jobLat?: number | null;
      jobLng?: number | null;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      slaDueAt?: string | null;
      technicianInventoryMap?: Record<string, boolean>;
    },
  ) {
    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);
    const technicians = await this.store.listTechnicians(tenantId);

    const scored = await Promise.all(
      technicians.map(async (tech) => {
        const [leaves, appts] = await Promise.all([
          this.store.listLeaves(tenantId, tech.id),
          this.store.listAppointments(tenantId, { from: startAt, to: endAt }),
        ]);
        const techAppts = appts.filter((a) => a.technicianId === tech.id);
        const availability = checkTechnicianAvailability(tech, startAt, endAt, leaves, techAppts);

        return scoreTechnicianForJob({
          technician: tech,
          requiredSkills: input.requiredSkills ?? [],
          available: availability.available,
          jobLat: input.jobLat ?? null,
          jobLng: input.jobLng ?? null,
          priority: input.priority ?? 'MEDIUM',
          slaDueAt: input.slaDueAt ? new Date(input.slaDueAt) : null,
          hasRequiredInventory: input.technicianInventoryMap?.[tech.id] ?? true,
        });
      }),
    );

    return scored.sort((a, b) => b.totalScore - a.totalScore);
  }

  async scheduleJob(
    tenantId: string,
    input: {
      workOrderId: string;
      technicianIds: string[];
      startAt: string;
      estimatedDurationMinutes?: number;
      requiredSkills?: string[];
      jobLat?: number | null;
      jobLng?: number | null;
      manualOverride?: boolean;
      overrideReason?: string;
    },
  ) {
    if (input.technicianIds.length === 0) {
      throw new BadRequestException('At least one technicianId is required');
    }
    if (input.manualOverride && !input.overrideReason?.trim()) {
      throw new BadRequestException('overrideReason is required when using manualOverride');
    }

    const durationMin = input.estimatedDurationMinutes ?? 60;
    const startAt = new Date(input.startAt);
    const endAt = new Date(startAt.getTime() + durationMin * 60 * 1000);
    const requiredSkills = input.requiredSkills ?? [];

    const appointments = [];
    for (const techId of input.technicianIds) {
      const tech = await this.store.findTechnicianById(tenantId, techId);
      if (!tech) throw new NotFoundException(`Technician ${techId} not found`);

      const [leaves, appts] = await Promise.all([
        this.store.listLeaves(tenantId, tech.id),
        this.store.listAppointments(tenantId, { from: startAt, to: endAt }),
      ]);
      const techAppts = appts.filter((a) => a.technicianId === tech.id);
      const availability = checkTechnicianAvailability(tech, startAt, endAt, leaves, techAppts);
      const missingSkills = requiredSkills.filter((s) => !tech.skills.includes(s));

      if (!input.manualOverride) {
        if (!availability.available) {
          throw new BadRequestException(
            `Technician ${tech.displayName} unavailable: ${availability.reason}`,
          );
        }
        if (missingSkills.length > 0) {
          throw new BadRequestException(
            `Technician ${tech.displayName} missing required skills: ${missingSkills.join(', ')}`,
          );
        }
      }

      const travel = estimateTravelMinutes(
        tech.homeLat,
        tech.homeLng,
        input.jobLat ?? null,
        input.jobLng ?? null,
      );

      const appt = await this.store.createAppointment({
        tenantId,
        workOrderId: input.workOrderId,
        technicianId: tech.id,
        startAt,
        endAt,
        estimatedDurationMinutes: durationMin,
        estimatedTravelMinutes: travel.travelMinutes,
        status: 'SCHEDULED',
      });
      appointments.push(appt);
    }

    return {
      appointments,
      manualOverrideApplied: Boolean(input.manualOverride),
      overrideReason: input.overrideReason ?? null,
    };
  }

  async emergencyReassign(
    tenantId: string,
    input: { appointmentId: string; newTechnicianId: string; reason: string; manualOverride?: boolean },
  ) {
    if (!input.reason?.trim()) {
      throw new BadRequestException('Reassignment reason is required');
    }
    const existing = await this.store.findAppointmentById(tenantId, input.appointmentId);
    if (!existing) throw new NotFoundException('Appointment not found');

    await this.store.updateAppointmentStatus(tenantId, existing.id, 'REASSIGNED');
    const scheduled = await this.scheduleJob(tenantId, {
      workOrderId: existing.workOrderId,
      technicianIds: [input.newTechnicianId],
      startAt: existing.startAt.toISOString(),
      estimatedDurationMinutes: existing.estimatedDurationMinutes,
      manualOverride: input.manualOverride,
      overrideReason: input.manualOverride ? input.reason : undefined,
    });

    return { reassignedFromId: existing.id, ...scheduled };
  }

  async optimizeTechnicianRoute(
    tenantId: string,
    input: { technicianId: string; stops: RouteStop[] },
  ) {
    const tech = await this.store.findTechnicianById(tenantId, input.technicianId);
    if (!tech) throw new NotFoundException('Technician not found');

    const originLat = tech.homeLat ?? input.stops[0]?.lat ?? 0;
    const originLng = tech.homeLng ?? input.stops[0]?.lng ?? 0;
    return optimizeRoute(originLat, originLng, input.stops);
  }
}
