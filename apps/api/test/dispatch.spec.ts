import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DispatchService } from '../src/modules/dispatch/dispatch.service';
import { InMemoryDispatchStore } from '../src/modules/dispatch/in-memory-dispatch.store';

describe('Phase 08 — Scheduling, Dispatch Scoring & Route Optimization', () => {
  it('enforces availability and skills, supports manual override, emergency reassign, and route optimization', async () => {
    const store = new InMemoryDispatchStore();
    const dispatch = new DispatchService(store);

    const tenantA = '11111111-1111-4111-8111-111111111111';
    const tenantB = '99999999-9999-4999-8999-999999999999';

    const techHvac = await dispatch.createTechnician(tenantA, {
      userId: 'u-1',
      displayName: 'Vikram HVAC',
      phone: '+919800000001',
      homeLat: 18.5204,
      homeLng: 73.8567,
      workingHours: { startHour: 9, endHour: 18 },
      skills: ['HVAC', 'BRAZING'],
    });

    const techRo = await dispatch.createTechnician(tenantA, {
      userId: 'u-2',
      displayName: 'Arjun RO',
      phone: '+919800000002',
      homeLat: 18.5913,
      homeLng: 73.7389,
      workingHours: { startHour: 9, endHour: 18 },
      skills: ['RO_WATER'],
    });

    // Recommendation scoring ranks Vikram highest for HVAC job
    const recs = await dispatch.recommendTechnicians(tenantA, {
      startAt: '2026-11-27T10:00:00.000Z',
      endAt: '2026-11-27T11:00:00.000Z',
      requiredSkills: ['HVAC'],
      jobLat: 18.53,
      jobLng: 73.85,
      priority: 'HIGH',
    });
    assert.equal(recs[0]?.technicianId, techHvac.id);
    assert.ok(recs[0]!.totalScore > recs[1]!.totalScore);

    // Reject assigning Arjun (lacks HVAC skill) without manualOverride
    await assert.rejects(
      () =>
        dispatch.scheduleJob(tenantA, {
          workOrderId: 'wo-1',
          technicianIds: [techRo.id],
          startAt: '2026-11-27T10:00:00.000Z',
          requiredSkills: ['HVAC'],
        }),
      BadRequestException,
    );

    // Schedule Vikram for 10:00-11:00 UTC
    const scheduled = await dispatch.scheduleJob(tenantA, {
      workOrderId: 'wo-1',
      technicianIds: [techHvac.id],
      startAt: '2026-11-27T10:00:00.000Z',
      estimatedDurationMinutes: 60,
      requiredSkills: ['HVAC'],
      jobLat: 18.53,
      jobLng: 73.85,
    });
    assert.equal(scheduled.appointments.length, 1);

    // Reject overlapping appointment for Vikram
    await assert.rejects(
      () =>
        dispatch.scheduleJob(tenantA, {
          workOrderId: 'wo-2',
          technicianIds: [techHvac.id],
          startAt: '2026-11-27T10:30:00.000Z',
          requiredSkills: ['HVAC'],
        }),
      BadRequestException,
    );

    // Approved leave blocks scheduling without override
    await dispatch.addLeave(tenantA, techHvac.id, {
      startAt: '2026-11-28T08:00:00.000Z',
      endAt: '2026-11-28T18:00:00.000Z',
      reason: 'Personal leave',
      status: 'APPROVED',
    });
    await assert.rejects(
      () =>
        dispatch.scheduleJob(tenantA, {
          workOrderId: 'wo-3',
          technicianIds: [techHvac.id],
          startAt: '2026-11-28T11:00:00.000Z',
        }),
      BadRequestException,
    );

    // Manual override with reason succeeds
    const overridden = await dispatch.scheduleJob(tenantA, {
      workOrderId: 'wo-3',
      technicianIds: [techHvac.id],
      startAt: '2026-11-28T11:00:00.000Z',
      manualOverride: true,
      overrideReason: 'Emergency VIP hospital chiller breakdown',
    });
    assert.equal(overridden.manualOverrideApplied, true);

    // Emergency reassignment
    const reassigned = await dispatch.emergencyReassign(tenantA, {
      appointmentId: scheduled.appointments[0]!.id,
      newTechnicianId: techRo.id,
      reason: 'Vikram stuck in traffic',
      manualOverride: true,
    });
    assert.equal(reassigned.appointments[0]?.technicianId, techRo.id);

    // Board views
    const weeklyBoard = await dispatch.getBoard(tenantA, 'weekly', '2026-11-27T00:00:00.000Z');
    assert.equal(weeklyBoard.view, 'weekly');
    assert.ok(weeklyBoard.appointments.length >= 2);

    // Route optimization
    const route = await dispatch.optimizeTechnicianRoute(tenantA, {
      technicianId: techHvac.id,
      stops: [
        { id: 'far', label: 'Hinjewadi', lat: 18.5913, lng: 73.7389 },
        { id: 'near', label: 'Shivajinagar', lat: 18.5308, lng: 73.8475 },
      ],
    });
    assert.equal(route.orderedStops[0]?.id, 'near');
    assert.ok(route.totalDistanceKm > 0);

    // Cross-tenant isolation
    await assert.rejects(
      () => dispatch.optimizeTechnicianRoute(tenantB, { technicianId: techHvac.id, stops: [] }),
      NotFoundException,
    );
  });
});
