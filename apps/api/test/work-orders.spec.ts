import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InMemoryWorkOrdersStore } from '../src/modules/work-orders/in-memory-work-orders.store';
import { ServiceRequestsService } from '../src/modules/work-orders/service-requests.service';
import { WorkOrdersService } from '../src/modules/work-orders/work-orders.service';

describe('Phase 06 — Service Requests, Work Orders & State Machine', () => {
  it('supports request categories, SLA calculation, conversion, multi-tech, multi-visit, checklists, photos, and reports', async () => {
    const store = new InMemoryWorkOrdersStore();
    const srService = new ServiceRequestsService(store);
    const woService = new WorkOrdersService(store);

    const tenantId = '11111111-1111-4111-8111-111111111111';
    const customerId = '33333333-3333-4333-8333-333333333333';
    const dispatcherId = '22222222-2222-4222-8222-222222222222';
    const tech1Id = '44444444-4444-4444-8444-444444444444';
    const tech2Id = '55555555-5555-4555-8555-555555555555';

    const cat = await srService.createCategory(tenantId, {
      name: 'AC Breakdown',
      code: 'AC_BRK',
      defaultSlaHours: 12,
    });

    const sr = await srService.createRequest(tenantId, dispatcherId, 'PORTAL', {
      customerId,
      categoryId: cat.id,
      title: 'Split AC not cooling in Conference Room',
      description: 'Compressor tripping after 5 minutes',
      priority: 'HIGH',
    });
    assert.equal(sr.source, 'PORTAL');
    assert.ok(sr.slaDueAt);

    const wo = await srService.convertToWorkOrder(tenantId, sr.id, dispatcherId);
    assert.equal(wo.status, 'NEW');
    assert.equal(wo.serviceRequestId, sr.id);

    // Invalid transition NEW -> COMPLETED must be rejected
    await assert.rejects(
      () => woService.transitionStatus(tenantId, wo.id, tech1Id, { status: 'COMPLETED' }),
      BadRequestException,
    );

    // Multi-technician assignment transitions NEW -> ASSIGNED
    const assigned = await woService.assignTechnicians(tenantId, wo.id, dispatcherId, [
      { technicianUserId: tech1Id, isLead: true },
      { technicianUserId: tech2Id, isLead: false },
    ]);
    assert.equal(assigned.length, 2);

    // Multiple visits
    const v1 = await woService.addVisit(tenantId, wo.id, { notes: 'Initial inspection' });
    const v2 = await woService.addVisit(tenantId, wo.id, { notes: 'Follow-up gas recharge' });
    assert.equal(v1.visitNumber, 1);
    assert.equal(v2.visitNumber, 2);

    // Valid transitions: ASSIGNED -> EN_ROUTE -> IN_PROGRESS -> COMPLETED
    await woService.transitionStatus(tenantId, wo.id, tech1Id, { status: 'EN_ROUTE' });
    await woService.transitionStatus(tenantId, wo.id, tech1Id, {
      status: 'IN_PROGRESS',
      technicianNotes: 'Replaced capacitor and topped up R32 refrigerant',
    });

    const cl = await woService.createChecklist(tenantId, wo.id, {
      title: 'AC Service Checklist',
      items: [
        { id: '1', label: 'Check compressor amp draw', completed: true },
        { id: '2', label: 'Verify drain line flow', completed: true },
      ],
    });
    assert.ok(cl.completedAt);

    await woService.addAttachment(tenantId, wo.id, tech1Id, {
      category: 'BEFORE_PHOTO',
      fileName: 'before.jpg',
      mimeType: 'image/jpeg',
      storageKey: 'tenants/t1/jobs/j1/before.jpg',
    });
    await woService.addAttachment(tenantId, wo.id, tech1Id, {
      category: 'AFTER_PHOTO',
      fileName: 'after.jpg',
      mimeType: 'image/jpeg',
      storageKey: 'tenants/t1/jobs/j1/after.jpg',
    });

    await woService.transitionStatus(tenantId, wo.id, tech1Id, { status: 'COMPLETED' });

    const report = await woService.approveAndReport(tenantId, wo.id, {
      summary: 'AC cooling restored',
      workPerformed: 'Capacitor replaced, coil cleaned, refrigerant checked',
      approvedByName: 'Meera Nair',
      customerApproved: true,
    });
    assert.equal(report.customerApproved, true);

    const details = await woService.getDetails(tenantId, wo.id);
    assert.equal(details.workOrder.status, 'COMPLETED');
    assert.equal(details.assignments.length, 2);
    assert.equal(details.visits.length, 2);
    assert.equal(details.attachments.length, 2);
    assert.equal(details.reports.length, 1);
    assert.ok(details.statusHistory.length >= 4);

    // Reopen completed job
    const reopened = await woService.reopen(tenantId, wo.id, dispatcherId, 'Customer reported noise');
    assert.equal(reopened?.status, 'PENDING');

    // Cancel job
    const cancelled = await woService.cancel(tenantId, wo.id, dispatcherId, 'Duplicate ticket');
    assert.equal(cancelled?.status, 'CANCELLED');

    // Cross-tenant isolation
    const tenantB = '99999999-9999-4999-8999-999999999999';
    await assert.rejects(() => woService.getDetails(tenantB, wo.id), NotFoundException);
  });
});
