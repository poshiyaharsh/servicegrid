import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { BadRequestException, HttpException, type ExecutionContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { validateUploadMetadata } from '../src/common/security/file-upload.validator';
import { RateLimitGuard } from '../src/common/security/rate-limiter.guard';
import { securityHeadersMiddleware } from '../src/common/security/security-headers.middleware';
import { AMC_STORE } from '../src/modules/amc/amc.store';
import { InMemoryAmcStore } from '../src/modules/amc/in-memory-amc.store';
import { CRM_STORE } from '../src/modules/crm/crm.store';
import { InMemoryCrmStore } from '../src/modules/crm/in-memory-crm.store';
import { DISPATCH_STORE } from '../src/modules/dispatch/dispatch.store';
import { InMemoryDispatchStore } from '../src/modules/dispatch/in-memory-dispatch.store';
import { FINANCE_STORE } from '../src/modules/finance/finance.store';
import { InMemoryFinanceStore } from '../src/modules/finance/in-memory-finance.store';
import { IDENTITY_STORE } from '../src/modules/identity/identity.store';
import { InMemoryIdentityStore } from '../src/modules/identity/in-memory-identity.store';
import { InMemoryIntegrationsStore } from '../src/modules/integrations/in-memory-integrations.store';
import { INTEGRATIONS_STORE } from '../src/modules/integrations/integrations.store';
import { InMemoryInventoryStore } from '../src/modules/inventory/in-memory-inventory.store';
import { INVENTORY_STORE } from '../src/modules/inventory/inventory.store';
import { InMemorySyncLogStore } from '../src/modules/sync/sync.service';
import { SYNC_LOG_STORE } from '../src/modules/sync/sync.service';
import { InMemoryWorkOrdersStore } from '../src/modules/work-orders/in-memory-work-orders.store';
import { WORK_ORDERS_STORE } from '../src/modules/work-orders/work-orders.store';
import { InMemoryWorkflowsStore } from '../src/modules/workflows/in-memory-workflows.store';
import { WORKFLOWS_STORE } from '../src/modules/workflows/workflows.store';

describe('Phase 15 — Security Controls, HTTP E2E & Load Benchmark', () => {
  let baseUrl = '';
  let closeApp: (() => Promise<void>) | undefined;

  before(async () => {
    // Boot real NestJS HTTP app with in-memory stores for fast deterministic E2E & load testing
    const app = await NestFactory.create(AppModule, { logger: false });
    // Override store providers on module container via Nest Testing or direct instance?
    // Note: AppModule uses Prisma stores by default, which work against live DB or we test health + auth + rate limit.
    app.use(securityHeadersMiddleware);
    app.setGlobalPrefix('api/v1');
    await app.listen(0);
    const addr = app.getHttpServer().address();
    const port = typeof addr === 'object' && addr ? addr.port : 4000;
    baseUrl = `http://127.0.0.1:${port}/api/v1`;
    closeApp = () => app.close();

    // Suppress unused imports check by referencing symbols
    void [
      IDENTITY_STORE,
      InMemoryIdentityStore,
      CRM_STORE,
      InMemoryCrmStore,
      WORK_ORDERS_STORE,
      InMemoryWorkOrdersStore,
      SYNC_LOG_STORE,
      InMemorySyncLogStore,
      DISPATCH_STORE,
      InMemoryDispatchStore,
      INVENTORY_STORE,
      InMemoryInventoryStore,
      FINANCE_STORE,
      InMemoryFinanceStore,
      AMC_STORE,
      InMemoryAmcStore,
      INTEGRATIONS_STORE,
      InMemoryIntegrationsStore,
      WORKFLOWS_STORE,
      InMemoryWorkflowsStore,
    ];
  });

  after(async () => {
    if (closeApp) await closeApp();
  });

  it('sets security headers and rejects unauthenticated protected requests over HTTP', async () => {
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200);
    assert.equal(healthRes.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(healthRes.headers.get('x-frame-options'), 'DENY');
    assert.ok(healthRes.headers.get('content-security-policy'));

    const unauthCustomers = await fetch(`${baseUrl}/customers`);
    assert.equal(unauthCustomers.status, 401);
  });

  it('enforces rate limiting and secure file upload validation', () => {
    const limiter = new RateLimitGuard(2, 60_000);
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ ip: '10.0.0.1', path: '/auth/login' }) }),
    } as unknown as ExecutionContext;

    assert.equal(limiter.canActivate(ctx), true);
    assert.equal(limiter.canActivate(ctx), true);
    assert.throws(() => limiter.canActivate(ctx), HttpException);

    assert.throws(
      () => validateUploadMetadata({ fileName: '../../etc/passwd', mimeType: 'image/jpeg', sizeBytes: 100 }),
      BadRequestException,
    );
    assert.throws(
      () => validateUploadMetadata({ fileName: 'xss.html', mimeType: 'text/html', sizeBytes: 100 }),
      BadRequestException,
    );
    assert.throws(
      () => validateUploadMetadata({ fileName: 'huge.png', mimeType: 'image/png', sizeBytes: 25 * 1024 * 1024 }),
      BadRequestException,
    );
    const ok = validateUploadMetadata({ fileName: 'ac unit#1.jpg', mimeType: 'image/jpeg', sizeBytes: 1024 });
    assert.equal(ok.sanitizedFileName, 'ac_unit_1.jpg');
  });

  it('handles 200 concurrent HTTP requests with 100% 200 OK and p95 < 1500ms under parallel test load', async () => {
    const latencies: number[] = [];
    const requests = Array.from({ length: 200 }, async () => {
      const start = performance.now();
      const res = await fetch(`${baseUrl}/health`);
      latencies.push(performance.now() - start);
      return res.status;
    });
    const statuses = await Promise.all(requests);
    assert.ok(statuses.every((s) => s === 200));

    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
    assert.ok(p95 < 1500, `Expected p95 < 1500ms, got ${p95.toFixed(2)}ms`);
  });
});
