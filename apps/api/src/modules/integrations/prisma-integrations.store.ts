import { Injectable } from '@nestjs/common';
import { withTenantTransaction, type Prisma } from '@servicegrid/database';
import type {
  IntegrationAccountRecord,
  IntegrationsStore,
  MessageTemplateRecord,
  NotificationLogRecord,
  WebhookEventRecord,
} from './integrations.store';
import type { ProviderType } from './provider-adapters';

@Injectable()
export class PrismaIntegrationsStore implements IntegrationsStore {
  async listAccounts(tenantId: string): Promise<IntegrationAccountRecord[]> {
    const rows = await withTenantTransaction(tenantId, (tx) =>
      tx.integrationAccount.findMany({ where: { tenantId } }),
    );
    return rows.map((r) => ({
      ...r,
      providerType: r.providerType as ProviderType,
      mode: r.mode as 'SANDBOX' | 'LIVE',
      config: r.config as Record<string, unknown>,
      healthStatus: r.healthStatus as IntegrationAccountRecord['healthStatus'],
    }));
  }

  async upsertAccount(input: Omit<IntegrationAccountRecord, 'id'>): Promise<IntegrationAccountRecord> {
    return withTenantTransaction(input.tenantId, async (tx) => {
      const row = await tx.integrationAccount.upsert({
        where: {
          tenantId_providerType: {
            tenantId: input.tenantId,
            providerType: input.providerType,
          },
        },
        create: {
          tenantId: input.tenantId,
          providerType: input.providerType,
          providerName: input.providerName,
          mode: input.mode,
          config: input.config as Prisma.InputJsonValue,
          isEnabled: input.isEnabled,
          healthStatus: input.healthStatus,
          lastCheckedAt: input.lastCheckedAt,
        },
        update: {
          providerName: input.providerName,
          mode: input.mode,
          config: input.config as Prisma.InputJsonValue,
          isEnabled: input.isEnabled,
          healthStatus: input.healthStatus,
          lastCheckedAt: input.lastCheckedAt,
        },
      });
      return {
        ...row,
        providerType: row.providerType as ProviderType,
        mode: row.mode as 'SANDBOX' | 'LIVE',
        config: row.config as Record<string, unknown>,
        healthStatus: row.healthStatus as IntegrationAccountRecord['healthStatus'],
      };
    });
  }

  async listTemplates(tenantId: string): Promise<MessageTemplateRecord[]> {
    const rows = await withTenantTransaction(tenantId, (tx) =>
      tx.messageTemplate.findMany({ where: { tenantId } }),
    );
    return rows.map((t) => ({ ...t, channel: t.channel as 'WHATSAPP' | 'EMAIL' | 'SMS' }));
  }

  async findTemplateByCode(
    tenantId: string,
    channel: 'WHATSAPP' | 'EMAIL' | 'SMS',
    code: string,
  ): Promise<MessageTemplateRecord | null> {
    const row = await withTenantTransaction(tenantId, (tx) =>
      tx.messageTemplate.findFirst({ where: { tenantId, channel, code } }),
    );
    if (!row) return null;
    return { ...row, channel: row.channel as 'WHATSAPP' | 'EMAIL' | 'SMS' };
  }

  async createTemplate(
    input: Omit<MessageTemplateRecord, 'id' | 'isActive'>,
  ): Promise<MessageTemplateRecord> {
    const row = await withTenantTransaction(input.tenantId, (tx) =>
      tx.messageTemplate.create({ data: input }),
    );
    return { ...row, channel: row.channel as 'WHATSAPP' | 'EMAIL' | 'SMS' };
  }

  async listNotifications(
    tenantId: string,
    status?: NotificationLogRecord['status'],
  ): Promise<NotificationLogRecord[]> {
    const rows = await withTenantTransaction(tenantId, (tx) =>
      tx.notificationLog.findMany({
        where: { tenantId, ...(status ? { status } : {}) },
        orderBy: { createdAt: 'desc' },
      }),
    );
    return rows.map((n) => ({
      ...n,
      channel: n.channel as 'WHATSAPP' | 'EMAIL' | 'SMS',
      status: n.status as NotificationLogRecord['status'],
    }));
  }

  async createNotification(
    input: Omit<NotificationLogRecord, 'id' | 'createdAt'>,
  ): Promise<NotificationLogRecord> {
    const row = await withTenantTransaction(input.tenantId, (tx) =>
      tx.notificationLog.create({ data: input }),
    );
    return {
      ...row,
      channel: row.channel as 'WHATSAPP' | 'EMAIL' | 'SMS',
      status: row.status as NotificationLogRecord['status'],
    };
  }

  async updateNotificationStatus(
    tenantId: string,
    id: string,
    patch: Partial<
      Pick<NotificationLogRecord, 'status' | 'providerMessageId' | 'failureReason' | 'attempts'>
    >,
  ): Promise<NotificationLogRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const existing = await tx.notificationLog.findFirst({ where: { id, tenantId } });
      if (!existing) return null;
      const row = await tx.notificationLog.update({ where: { id }, data: patch });
      return {
        ...row,
        channel: row.channel as 'WHATSAPP' | 'EMAIL' | 'SMS',
        status: row.status as NotificationLogRecord['status'],
      };
    });
  }

  async createWebhookEvent(
    input: Omit<WebhookEventRecord, 'id' | 'receivedAt' | 'processedAt'>,
  ): Promise<WebhookEventRecord> {
    const row = await withTenantTransaction(input.tenantId, (tx) =>
      tx.webhookEvent.create({
        data: {
          ...input,
          payload: input.payload as Prisma.InputJsonValue,
        },
      }),
    );
    return {
      ...row,
      payload: row.payload as Record<string, unknown>,
      status: row.status as WebhookEventRecord['status'],
    };
  }

  async findWebhookEventById(tenantId: string, id: string): Promise<WebhookEventRecord | null> {
    const row = await withTenantTransaction(tenantId, (tx) =>
      tx.webhookEvent.findFirst({ where: { id, tenantId } }),
    );
    if (!row) return null;
    return {
      ...row,
      payload: row.payload as Record<string, unknown>,
      status: row.status as WebhookEventRecord['status'],
    };
  }

  async updateWebhookEvent(
    tenantId: string,
    id: string,
    patch: Partial<Pick<WebhookEventRecord, 'status' | 'attempts' | 'lastError' | 'processedAt'>>,
  ): Promise<WebhookEventRecord | null> {
    return withTenantTransaction(tenantId, async (tx) => {
      const existing = await tx.webhookEvent.findFirst({ where: { id, tenantId } });
      if (!existing) return null;
      const row = await tx.webhookEvent.update({ where: { id }, data: patch });
      return {
        ...row,
        payload: row.payload as Record<string, unknown>,
        status: row.status as WebhookEventRecord['status'],
      };
    });
  }
}
