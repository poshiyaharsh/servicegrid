import type { ProviderType } from './provider-adapters';

export interface IntegrationAccountRecord {
  id: string;
  tenantId: string;
  providerType: ProviderType;
  providerName: string;
  mode: 'SANDBOX' | 'LIVE';
  config: Record<string, unknown>;
  isEnabled: boolean;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNCONFIGURED';
  lastCheckedAt: Date | null;
}

export interface MessageTemplateRecord {
  id: string;
  tenantId: string;
  channel: 'WHATSAPP' | 'EMAIL' | 'SMS';
  code: string;
  name: string;
  bodyTemplate: string;
  variables: string[];
  isActive: boolean;
}

export interface NotificationLogRecord {
  id: string;
  tenantId: string;
  channel: 'WHATSAPP' | 'EMAIL' | 'SMS';
  recipient: string;
  templateCode: string | null;
  renderedBody: string;
  status: 'QUEUED' | 'SENT_SANDBOX' | 'DELIVERED' | 'FAILED';
  providerMessageId: string | null;
  failureReason: string | null;
  attempts: number;
  createdAt: Date;
}

export interface WebhookEventRecord {
  id: string;
  tenantId: string;
  provider: string;
  eventType: string;
  signatureValid: boolean;
  payload: Record<string, unknown>;
  status: 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'RETRY_SCHEDULED';
  attempts: number;
  lastError: string | null;
  receivedAt: Date;
  processedAt: Date | null;
}

export const INTEGRATIONS_STORE = Symbol('INTEGRATIONS_STORE');

export interface IntegrationsStore {
  listAccounts(tenantId: string): Promise<IntegrationAccountRecord[]>;
  upsertAccount(input: Omit<IntegrationAccountRecord, 'id'>): Promise<IntegrationAccountRecord>;

  listTemplates(tenantId: string): Promise<MessageTemplateRecord[]>;
  findTemplateByCode(
    tenantId: string,
    channel: 'WHATSAPP' | 'EMAIL' | 'SMS',
    code: string,
  ): Promise<MessageTemplateRecord | null>;
  createTemplate(input: Omit<MessageTemplateRecord, 'id' | 'isActive'>): Promise<MessageTemplateRecord>;

  listNotifications(tenantId: string, status?: NotificationLogRecord['status']): Promise<NotificationLogRecord[]>;
  createNotification(input: Omit<NotificationLogRecord, 'id' | 'createdAt'>): Promise<NotificationLogRecord>;
  updateNotificationStatus(
    tenantId: string,
    id: string,
    patch: Partial<
      Pick<NotificationLogRecord, 'status' | 'providerMessageId' | 'failureReason' | 'attempts'>
    >,
  ): Promise<NotificationLogRecord | null>;

  createWebhookEvent(
    input: Omit<WebhookEventRecord, 'id' | 'receivedAt' | 'processedAt'>,
  ): Promise<WebhookEventRecord>;
  findWebhookEventById(tenantId: string, id: string): Promise<WebhookEventRecord | null>;
  updateWebhookEvent(
    tenantId: string,
    id: string,
    patch: Partial<Pick<WebhookEventRecord, 'status' | 'attempts' | 'lastError' | 'processedAt'>>,
  ): Promise<WebhookEventRecord | null>;
}
