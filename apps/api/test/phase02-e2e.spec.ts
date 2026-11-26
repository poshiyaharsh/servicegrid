import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { Module, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { securityHeadersMiddleware } from '../src/common/security/security-headers.middleware';
import { AmcController } from '../src/modules/amc/amc.controller';
import { AmcService } from '../src/modules/amc/amc.service';
import { AMC_STORE } from '../src/modules/amc/amc.store';
import { InMemoryAmcStore } from '../src/modules/amc/in-memory-amc.store';
import { AiIntelligenceService } from '../src/modules/analytics/ai.service';
import { AnalyticsController } from '../src/modules/analytics/analytics.controller';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { CRM_STORE } from '../src/modules/crm/crm.store';
import { CustomersController } from '../src/modules/crm/customers.controller';
import { CustomersService } from '../src/modules/crm/customers.service';
import { InMemoryCrmStore } from '../src/modules/crm/in-memory-crm.store';
import { FINANCE_STORE } from '../src/modules/finance/finance.store';
import { InMemoryFinanceStore } from '../src/modules/finance/in-memory-finance.store';
import { IDENTITY_STORE } from '../src/modules/identity/identity.store';
import { InMemoryIdentityStore } from '../src/modules/identity/in-memory-identity.store';
import { INVENTORY_STORE } from '../src/modules/inventory/inventory.store';
import { InMemoryInventoryStore } from '../src/modules/inventory/in-memory-inventory.store';
import { InMemoryWorkOrdersStore } from '../src/modules/work-orders/in-memory-work-orders.store';
import { ServiceRequestsController } from '../src/modules/work-orders/service-requests.controller';
import { ServiceRequestsService } from '../src/modules/work-orders/service-requests.service';
import { WorkOrdersController } from '../src/modules/work-orders/work-orders.controller';
import { WorkOrdersService } from '../src/modules/work-orders/work-orders.service';
import { WORK_ORDERS_STORE } from '../src/modules/work-orders/work-orders.store';

@Module({
  controllers: [
    AuthController,
    CustomersController,
    ServiceRequestsController,
    WorkOrdersController,
    AnalyticsController,
    AmcController,
  ],
  providers: [
    { provide: IDENTITY_STORE, useClass: InMemoryIdentityStore },
    { provide: CRM_STORE, useClass: InMemoryCrmStore },
    { provide: WORK_ORDERS_STORE, useClass: InMemoryWorkOrdersStore },
    { provide: FINANCE_STORE, useClass: InMemoryFinanceStore },
    { provide: INVENTORY_STORE, useClass: InMemoryInventoryStore },
    { provide: AMC_STORE, useClass: InMemoryAmcStore },
    AuthService,
    CustomersService,
    ServiceRequestsService,
    WorkOrdersService,
    AnalyticsService,
    AiIntelligenceService,
    AmcService,
  ],
})
class Phase02E2eTestModule {}

describe('Phase 02G — Full MVP User Journey E2E (Auth, CRM, SR, WO, Dashboard, Isolation)', () => {
  let app: INestApplication;
  let baseUrl: string;

  before(async () => {
    app = await NestFactory.create(Phase02E2eTestModule, { logger: false });
    app.use(securityHeadersMiddleware);
    app.setGlobalPrefix('api/v1');
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  after(async () => {
    if (app) await app.close();
  });

  it('executes auth cookie refresh, customer CRUD, SR->WO workflow, dashboard metrics, and tenant isolation', async () => {
    // 1. Register Tenant A
    const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationName: 'CoolTech Mumbai',
        fullName: 'Aarav Owner',
        email: 'aarav@cooltech.test',
        password: 'StrongPassword123!',
      }),
    });
    assert.equal(regRes.status, 201);
    const setCookie = regRes.headers.get('set-cookie') ?? '';
    assert.match(setCookie, /fs_refresh_token=/);
    assert.match(setCookie, /HttpOnly/i);
    const regJson = (await regRes.json()) as {
      success: boolean;
      data: { accessToken: string; tenant: { id: string } };
    };
    assert.equal(regJson.success, true);

    // 2. Refresh via HttpOnly cookie without body token
    const cookiePair = setCookie.split(';')[0] ?? '';
    const refreshRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookiePair },
      body: JSON.stringify({}),
    });
    assert.equal(refreshRes.status, 201);
    const refreshJson = (await refreshRes.json()) as { data: { accessToken: string } };
    const token = refreshJson.data.accessToken;

    // 3. /auth/me
    const meRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(meRes.status, 200);
    const meJson = (await meRes.json()) as { data: { user: { email: string }; tenant: { name: string } } };
    assert.equal(meJson.data.user.email, 'aarav@cooltech.test');
    assert.equal(meJson.data.tenant.name, 'CoolTech Mumbai');

    // 4. Customer CRUD + contact + address
    const custCreate = await fetch(`${baseUrl}/api/v1/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        customerType: 'BUSINESS',
        displayName: 'Apex Diagnostics',
        primaryPhone: '+919876543210',
        primaryEmail: 'ops@apex.in',
      }),
    });
    assert.equal(custCreate.status, 201);
    const custJson = (await custCreate.json()) as { data: { id: string } };
    const customerId = custJson.data.id;

    const addAddr = await fetch(`${baseUrl}/api/v1/customers/${customerId}/addresses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        label: 'HQ',
        line1: '14 MG Road',
        city: 'Mumbai',
        state: 'MH',
        postalCode: '400001',
      }),
    });
    assert.equal(addAddr.status, 201);

    // 5. Create Service Request & Convert to Work Order
    const srRes = await fetch(`${baseUrl}/api/v1/service-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        customerId,
        title: 'Chiller not cooling',
        description: 'Compressor trips after 5 minutes',
        priority: 'HIGH',
      }),
    });
    assert.equal(srRes.status, 201);
    const srJson = (await srRes.json()) as { data: { id: string } };

    const convRes = await fetch(`${baseUrl}/api/v1/service-requests/${srJson.data.id}/convert`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(convRes.status, 201);
    const woJson = (await convRes.json()) as { data: { id: string; status: string } };
    assert.equal(woJson.data.status, 'NEW');

    // 6. Valid vs Invalid Work Order transition
    const invalidTrans = await fetch(`${baseUrl}/api/v1/work-orders/${woJson.data.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    assert.equal(invalidTrans.status, 400);

    const validTrans = await fetch(`${baseUrl}/api/v1/work-orders/${woJson.data.id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 'SCHEDULED', reason: 'Confirmed with client' }),
    });
    assert.equal(validTrans.status, 201);

    // 7. Dashboard reflects real backend metrics
    const dashRes = await fetch(`${baseUrl}/api/v1/analytics/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(dashRes.status, 200);
    const dashJson = (await dashRes.json()) as {
      data: { totalCustomers: number; openServiceRequests: number; activeWorkOrders: number };
    };
    assert.equal(dashJson.data.totalCustomers, 1);
    assert.equal(dashJson.data.openServiceRequests, 0);
    assert.equal(dashJson.data.activeWorkOrders, 1);

    // 8. Cross-tenant header spoofing rejected
    const spoofRes = await fetch(`${baseUrl}/api/v1/customers`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-tenant-id': '99999999-9999-4999-8999-999999999999',
      },
    });
    assert.equal(spoofRes.status, 403);
  });
});
