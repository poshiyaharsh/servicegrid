import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { FINANCE_STORE, type FinanceStore } from '../finance/finance.store';
import { INTEGRATIONS_STORE, type IntegrationsStore } from './integrations.store';
import {
  checkProviderHealth,
  createSignedUploadUrl,
  SandboxMessagingAdapter,
  verifyWebhookHmacSignature,
  type ProviderType,
} from './provider-adapters';

@Injectable()
export class IntegrationsService {
  constructor(
    @Inject(INTEGRATIONS_STORE) private readonly store: IntegrationsStore,
    @Inject(FINANCE_STORE) private readonly financeStore: FinanceStore,
  ) {}

  async configureIntegration(
    tenantId: string,
    input: {
      providerType: ProviderType;
      providerName: string;
      mode?: 'SANDBOX' | 'LIVE';
      config?: Record<string, unknown>;
      isEnabled?: boolean;
    },
  ) {
    const mode = input.mode ?? 'SANDBOX';
    const config = input.config ?? {};
    const health = checkProviderHealth(input.providerType, input.providerName, mode, config);

    return this.store.upsertAccount({
      tenantId,
      providerType: input.providerType,
      providerName: input.providerName,
      mode,
      config,
      isEnabled: input.isEnabled ?? true,
      healthStatus: health.status,
      lastCheckedAt: new Date(),
    });
  }

  async getHealthReport(tenantId: string) {
    const accounts = await this.store.listAccounts(tenantId);
    return accounts.map((acc) =>
      checkProviderHealth(acc.providerType, acc.providerName, acc.mode, acc.config),
    );
  }

  async createTemplate(
    tenantId: string,
    input: {
      channel: 'WHATSAPP' | 'EMAIL' | 'SMS';
      code: string;
      name: string;
      bodyTemplate: string;
      variables?: string[];
    },
  ) {
    return this.store.createTemplate({
      tenantId,
      channel: input.channel,
      code: input.code.toUpperCase(),
      name: input.name,
      bodyTemplate: input.bodyTemplate,
      variables: input.variables ?? [],
    });
  }

  async listTemplates(tenantId: string) {
    return this.store.listTemplates(tenantId);
  }

  async sendNotification(
    tenantId: string,
    input: {
      channel: 'WHATSAPP' | 'EMAIL' | 'SMS';
      recipient: string;
      templateCode?: string;
      variables?: Record<string, string>;
      body?: string;
    },
  ) {
    let renderedBody = input.body ?? '';
    if (input.templateCode) {
      const tpl = await this.store.findTemplateByCode(
        tenantId,
        input.channel,
        input.templateCode.toUpperCase(),
      );
      if (!tpl) throw new NotFoundException(`Template ${input.templateCode} not found`);
      renderedBody = tpl.bodyTemplate;
      for (const [k, v] of Object.entries(input.variables ?? {})) {
        renderedBody = renderedBody.replaceAll(`{{${k}}}`, v);
      }
    }

    const log = await this.store.createNotification({
      tenantId,
      channel: input.channel,
      recipient: input.recipient,
      templateCode: input.templateCode?.toUpperCase() ?? null,
      renderedBody,
      status: 'QUEUED',
      providerMessageId: null,
      failureReason: null,
      attempts: 1,
    });

    const adapter = new SandboxMessagingAdapter(input.channel);
    const result = await adapter.sendMessage({
      recipient: input.recipient,
      body: renderedBody,
    });

    return this.store.updateNotificationStatus(tenantId, log.id, {
      status: result.status,
      providerMessageId: result.providerMessageId || null,
      failureReason: result.error ?? null,
    });
  }

  async listNotifications(tenantId: string, status?: 'QUEUED' | 'SENT_SANDBOX' | 'DELIVERED' | 'FAILED') {
    return this.store.listNotifications(tenantId, status);
  }

  async getSignedUploadUrl(tenantId: string, fileName: string) {
    return createSignedUploadUrl(tenantId, fileName);
  }

  async exportAccountingCsv(tenantId: string) {
    const invoices = await this.financeStore.listOutstandingInvoices(tenantId);
    const header = 'invoiceNumber,fiscalYear,currency,subtotal,cgstTotal,sgstTotal,igstTotal,grandTotal,balanceDue,status';
    const rows = invoices.map((i) =>
      [
        i.invoiceNumber,
        i.fiscalYear,
        i.currency,
        i.subtotal,
        i.cgstTotal,
        i.sgstTotal,
        i.igstTotal,
        i.grandTotal,
        i.balanceDue,
        i.status,
      ].join(','),
    );
    return [header, ...rows].join('\n');
  }

  async ingestWebhook(input: {
    tenantId: string;
    provider: string;
    eventType: string;
    rawBody: string;
    signature: string;
    secret: string;
    payload: Record<string, unknown>;
  }) {
    const signatureValid = verifyWebhookHmacSignature(input.rawBody, input.signature, input.secret);
    const event = await this.store.createWebhookEvent({
      tenantId: input.tenantId,
      provider: input.provider,
      eventType: input.eventType,
      signatureValid,
      payload: input.payload,
      status: signatureValid ? 'PROCESSED' : 'FAILED',
      attempts: 1,
      lastError: signatureValid ? null : 'Invalid webhook HMAC signature',
    });

    if (!signatureValid) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    return this.store.updateWebhookEvent(input.tenantId, event.id, {
      status: 'PROCESSED',
      processedAt: new Date(),
    });
  }

  async retryWebhook(tenantId: string, webhookId: string) {
    const existing = await this.store.findWebhookEventById(tenantId, webhookId);
    if (!existing) throw new NotFoundException('Webhook event not found');
    return this.store.updateWebhookEvent(tenantId, webhookId, {
      status: 'PROCESSED',
      attempts: existing.attempts + 1,
      lastError: null,
      processedAt: new Date(),
    });
  }
}
