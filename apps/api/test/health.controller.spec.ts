import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HealthController } from '../src/modules/health/health.controller';

describe('HealthController', () => {
  it('returns liveness status ok', () => {
    const controller = new HealthController();
    const res = controller.getLiveness();
    assert.equal(res.success, true);
    assert.equal(res.data.status, 'ok');
    assert.equal(res.data.service, 'fieldsutra-api');
  });

  it('returns readiness status ready', () => {
    const controller = new HealthController();
    const res = controller.getReadiness();
    assert.equal(res.success, true);
    assert.equal(res.data.status, 'ready');
  });
});
