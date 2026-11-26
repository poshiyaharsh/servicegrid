import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { describe, it } from 'node:test';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InMemoryFinanceStore } from '../src/modules/finance/in-memory-finance.store';
import { InMemoryIntegrationsStore } from '../src/modules/integrations/in-memory-integrations.store';
import { IntegrationsService } from '../src/modules/integrations/integrations.service';

describe('Phase 12 — Communication, Provider Adapters & Webhooks', () => {
  it('monitors integration health, renders templates, tracks failed deliveries, and verifies webhooks', async () => {
    const intStore = new InMemoryIntegrationsStore();
    const finStore = new InMemoryFinanceStore();
    const service = new IntegrationsService(intStore, finStore);

    const tenantA = '11111111-1111-4111-8111-111111111111';
    const tenantB = '99999999-9999-4999-8999-999999999999';

    // Sandbox WhatsApp -> HEALTHY
    await service.configureIntegration(tenantA, {
      providerType: 'WHATSAPP',
      providerName: 'Meta WhatsApp Business Cloud API',
      mode: 'SANDBOX',
    });

    // Live Payment Gateway without credentials -> explicitly UNCONFIGURED
    await service.configureIntegration(tenantA, {
      providerType: 'PAYMENT_GATEWAY',
      providerName: 'Razorpay',
      mode: 'LIVE',
      config: { credentialConfigured: false },
    });

    const health = await service.getHealthReport(tenantA);
    assert.equal(health.find((h) => h.providerType === 'WHATSAPP')?.status, 'HEALTHY');
    assert.equal(health.find((h) => h.providerType === 'PAYMENT_GATEWAY')?.status, 'UNCONFIGURED');

    // Template & Notification
    await service.createTemplate(tenantA, {
      channel: 'WHATSAPP',
      code: 'TECH_EN_ROUTE',
      name: 'Technician En Route',
      bodyTemplate: 'Hi {{customer}}, {{tech}} is on the way for job {{jobNumber}}.',
      variables: ['customer', 'tech', 'jobNumber'],
    });

    const sent = await service.sendNotification(tenantA, {
      channel: 'WHATSAPP',
      recipient: '+919876543210',
      templateCode: 'TECH_EN_ROUTE',
      variables: { customer: 'Meera', tech: 'Vikram', jobNumber: 'JOB-101' },
    });
    assert.equal(sent?.status, 'SENT_SANDBOX');
    assert.equal(sent?.renderedBody, 'Hi Meera, Vikram is on the way for job JOB-101.');

    // Failed delivery tracking
    const failed = await service.sendNotification(tenantA, {
      channel: 'SMS',
      recipient: 'fail-number',
      body: 'Test SMS',
    });
    assert.equal(failed?.status, 'FAILED');
    assert.equal((await service.listNotifications(tenantA, 'FAILED')).length, 1);

    // Signed upload URL
    const upload = await service.getSignedUploadUrl(tenantA, 'compressor.jpg');
    assert.ok(upload.uploadUrl.includes('X-Amz-Expires=300'));

    // Webhook HMAC verification
    const secret = 'whsec_test_123';
    const payload = { event: 'payment.captured', amount: 5000 };
    const rawBody = JSON.stringify(payload);
    const validSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    await assert.rejects(
      () =>
        service.ingestWebhook({
          tenantId: tenantA,
          provider: 'razorpay',
          eventType: 'payment.captured',
          rawBody,
          signature: 'tampered_sig',
          secret,
          payload,
        }),
      UnauthorizedException,
    );

    const validEvent = await service.ingestWebhook({
      tenantId: tenantA,
      provider: 'razorpay',
      eventType: 'payment.captured',
      rawBody,
      signature: validSig,
      secret,
      payload,
    });
    assert.equal(validEvent?.status, 'PROCESSED');

    // Cross-tenant isolation on webhook retry
    await assert.rejects(
      () => service.retryWebhook(tenantB, validEvent!.id),
      NotFoundException,
    );
  });
});
