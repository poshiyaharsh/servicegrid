import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { InMemoryWorkflowsStore } from '../src/modules/workflows/in-memory-workflows.store';
import { WorkflowsService } from '../src/modules/workflows/workflows.service';

describe('Phase 14 — Loop-Safe Workflows & Customer Feedback', () => {
  it('validates workflows, evaluates conditions, and prevents infinite execution loops', async () => {
    const store = new InMemoryWorkflowsStore();
    const service = new WorkflowsService(store);
    const tenantA = '11111111-1111-4111-8111-111111111111';

    // Direct self-emitting cycle must be rejected on creation
    await assert.rejects(
      () =>
        service.createDefinition(tenantA, {
          name: 'Self Loop',
          triggerEvent: 'JOB_COMPLETED',
          actions: [{ type: 'EMIT_EVENT', config: { event: 'JOB_COMPLETED' } }],
        }),
      BadRequestException,
    );

    // 2-step cycle A -> B -> A must be blocked at runtime with BLOCKED_LOOP
    await service.createDefinition(tenantA, {
      name: 'Workflow A',
      triggerEvent: 'EVENT_A',
      actions: [{ type: 'EMIT_EVENT', config: { event: 'EVENT_B' } }],
    });
    await service.createDefinition(tenantA, {
      name: 'Workflow B',
      triggerEvent: 'EVENT_B',
      actions: [{ type: 'EMIT_EVENT', config: { event: 'EVENT_A' } }],
    });

    const loopRuns = await service.executeTrigger(tenantA, {
      triggerEvent: 'EVENT_A',
      payload: {},
    });
    assert.ok(loopRuns.some((r) => r.status === 'BLOCKED_LOOP'));

    // Standard conditional workflow: low stock -> alert inventory manager
    await service.createDefinition(tenantA, {
      name: 'Low Stock Alert',
      triggerEvent: 'STOCK_UPDATED',
      conditions: [{ field: 'quantity', operator: 'LTE', value: 3 }],
      actions: [{ type: 'NOTIFICATION', config: { role: 'INVENTORY_MANAGER' } }],
    });

    const noAlert = await service.executeTrigger(tenantA, {
      triggerEvent: 'STOCK_UPDATED',
      payload: { quantity: 10 },
    });
    assert.equal(noAlert.length, 0);

    const alertRuns = await service.executeTrigger(tenantA, {
      triggerEvent: 'STOCK_UPDATED',
      payload: { quantity: 2 },
    });
    assert.equal(alertRuns.length, 1);
    assert.equal(alertRuns[0]?.status, 'COMPLETED');
    assert.deepEqual(alertRuns[0]?.executedActions, ['NOTIFICATION']);
  });
});
