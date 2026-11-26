import crypto from 'node:crypto';

export type ProviderType =
  | 'WHATSAPP'
  | 'EMAIL'
  | 'SMS'
  | 'PAYMENT_GATEWAY'
  | 'MAPS'
  | 'CLOUD_STORAGE'
  | 'ACCOUNTING';

export interface IntegrationHealthResult {
  providerType: ProviderType;
  providerName: string;
  mode: 'SANDBOX' | 'LIVE';
  status: 'HEALTHY' | 'DEGRADED' | 'UNCONFIGURED';
  message: string;
}

export interface MessagingAdapter {
  sendMessage(input: {
    recipient: string;
    body: string;
    templateCode?: string;
  }): Promise<{ providerMessageId: string; status: 'SENT_SANDBOX' | 'DELIVERED' | 'FAILED'; error?: string }>;
}

export class SandboxMessagingAdapter implements MessagingAdapter {
  constructor(private readonly channel: 'WHATSAPP' | 'EMAIL' | 'SMS') {}

  async sendMessage(input: { recipient: string; body: string }) {
    if (input.recipient.includes('fail')) {
      return {
        providerMessageId: '',
        status: 'FAILED' as const,
        error: `Sandbox simulated ${this.channel} delivery failure`,
      };
    }
    return {
      providerMessageId: `sbx_${this.channel.toLowerCase()}_${crypto.randomBytes(6).toString('hex')}`,
      status: 'SENT_SANDBOX' as const,
    };
  }
}

export interface SignedUploadUrlResult {
  mode: 'SANDBOX' | 'LIVE';
  storageKey: string;
  uploadUrl: string;
  expiresInSeconds: number;
}

export function createSignedUploadUrl(tenantId: string, fileName: string): SignedUploadUrlResult {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storageKey = `tenants/${tenantId}/uploads/${Date.now()}_${safeName}`;
  return {
    mode: 'SANDBOX',
    storageKey,
    uploadUrl: `http://localhost:9000/fieldsutra-uploads/${storageKey}?X-Amz-Expires=300`,
    expiresInSeconds: 300,
  };
}

export function verifyWebhookHmacSignature(
  rawBody: string,
  providedSignature: string,
  secret: string,
): boolean {
  if (!providedSignature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(providedSignature.replace(/^sha256=/, ''));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function checkProviderHealth(
  providerType: ProviderType,
  providerName: string,
  mode: 'SANDBOX' | 'LIVE',
  config: Record<string, unknown>,
): IntegrationHealthResult {
  if (mode === 'SANDBOX') {
    return {
      providerType,
      providerName,
      mode,
      status: 'HEALTHY',
      message: `${providerName} running in sandbox mode`,
    };
  }

  const hasCredentialRef = Boolean(config['credentialConfigured']);
  if (!hasCredentialRef) {
    return {
      providerType,
      providerName,
      mode,
      status: 'UNCONFIGURED',
      message: `${providerName} is set to LIVE but required credentials are not configured`,
    };
  }

  return {
    providerType,
    providerName,
    mode,
    status: 'HEALTHY',
    message: `${providerName} live integration configured`,
  };
}
