import crypto from 'node:crypto';
import type {
  IntegrationAccountRecord,
  IntegrationsStore,
  MessageTemplateRecord,
  NotificationLogRecord,
  WebhookEventRecord,
} from './integrations.store';
import type { ProviderType } from './provider-adapters';

export class InMemoryIntegrationsStore implements IntegrationsStore {
  private accounts = new Map<string, IntegrationAccountRecord>();
  private templates = new Map<string, MessageTemplateRecord>();
  private notifications = new Map<string, NotificationLogRecord>();
  private webhooks = new Map<string, WebhookEventRecord>();

  async listAccounts(tenantId: string) {
    return [...this.accounts.values()].filter((a) => a.tenantId === tenantId);
  }

  async upsertAccount(input: Omit<IntegrationAccountRecord, 'id'>) {
    const existing = [...this.accounts.values()].find(
      (a) => a.tenantId === input.tenantId && a.providerType === input.providerType,
    );
    const rec: IntegrationAccountRecord = { id: existing?.id ?? crypto.randomUUID(), ...input };
    this.accounts.set(rec.id, rec);
    return rec;
  }

  async listTemplates(tenantId: string) {
    return [...this.templates.values()].filter((t) => t.tenantId === tenantId);
  }

  async findTemplateByCode(
    tenantId: string,
    channel: 'WHATSAPP' | 'EMAIL' | 'SMS',
    code: string,
  ) {
    return (
      [...this.templates.values()].find(
        (t) => t.tenantId === tenantId && t.channel === channel && t.code === code,
      ) ?? null
    );
  }

  async createTemplate(input: Omit<MessageTemplateRecord, 'id' | 'isActive'>) {
    const rec: MessageTemplateRecord = { id: crypto.randomUUID(), isActive: true, ...input };
    this.templates.set(rec.id, rec);
    return rec;
  }

  async listNotifications(tenantId: string, status?: NotificationLogRecord['status']) {
    return [...this.notifications.values()].filter(
      (n) => n.tenantId === tenantId && (!status || n.status === status),
    );
  }

  async createNotification(input: Omit<NotificationLogRecord, 'id' | 'createdAt'>) {
    const rec: NotificationLogRecord = { id: crypto.randomUUID(), createdAt: new Date(), ...input };
    this.notifications.set(rec.id, rec);
    return rec;
  }

  async updateNotificationStatus(
    tenantId: string,
    id: string,
    patch: Partial<
      Pick<NotificationLogRecord, 'status' | 'providerMessageId' | 'failureReason' | 'attempts'>
    >,
  ) {
    const n = this.notifications.get(id);
    if (!n || n.tenantId !== tenantId) return null;
    const updated = { ...n, ...patch };
    this.notifications.set(id, updated);
    return updated;
  }

  async createWebhookEvent(
    input: Omit<WebhookEventRecord, 'id' | 'receivedAt' | 'processedAt'>,
  ) {
    const rec: WebhookEventRecord = {
      id: crypto.randomUUID(),
      receivedAt: new Date(),
      processedAt: null,
      ...input,
    };
    this.webhooks.set(rec.id, rec);
    return rec;
  }

  async findWebhookEventById(tenantId: string, id: string) {
    const w = this.webhooks.get(id);
    return w && w.tenantId === tenantId ? w : null;
  }

  async updateWebhookEvent(
    tenantId: string,
    id: string,
    patch: Partial<Pick<WebhookEventRecord, 'status' | 'attempts' | 'lastError' | 'processedAt'>>,
  ) {
    const w = await this.findWebhookEventById(tenantId, id);
    if (!w) return null;
    const updated = { ...w, ...patch };
    this.webhooks.set(id, updated);
    return updated;
  }
}

export type { ProviderType };
