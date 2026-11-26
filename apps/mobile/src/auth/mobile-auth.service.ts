import { ApiClient, ApiClientError, type AuthUserSummary } from '@servicegrid/api-client';
import type { SecureTokenStorage } from './secure-storage';

const KEYS = {
  ACCESS_TOKEN: 'fs_mobile_access_token',
  REFRESH_TOKEN: 'fs_mobile_refresh_token',
  DEVICE_ID: 'fs_mobile_device_id',
} as const;

export interface MobileSession {
  user: AuthUserSummary;
  tenant: { id: string; name: string; currency?: string; timezone?: string };
  deviceId: string;
}

export class MobileAuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  readonly api: ApiClient;

  constructor(
    baseUrl: string,
    private readonly storage: SecureTokenStorage,
    private readonly onSessionExpired?: () => void,
    fetchImpl?: typeof fetch,
  ) {
    this.api = new ApiClient({
      baseUrl,
      getAccessToken: () => this.accessToken,
      onAccessTokenRefreshed: (newToken) => {
        this.accessToken = newToken;
        void this.storage.setItem(KEYS.ACCESS_TOKEN, newToken);
      },
      onUnauthorized: () => {
        this.accessToken = null;
        this.onSessionExpired?.();
      },
      fetchImpl,
    });
  }

  async getOrCreateDeviceId(): Promise<string> {
    const existing = await this.storage.getItem(KEYS.DEVICE_ID);
    if (existing) return existing;
    const generated = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    await this.storage.setItem(KEYS.DEVICE_ID, generated);
    return generated;
  }

  async login(email: string, password: string): Promise<MobileSession> {
    const res = await this.api.login({ email, password });
    this.accessToken = res.data.accessToken;
    this.refreshToken = res.data.refreshToken;
    await Promise.all([
      this.storage.setItem(KEYS.ACCESS_TOKEN, res.data.accessToken),
      this.storage.setItem(KEYS.REFRESH_TOKEN, res.data.refreshToken),
    ]);

    const me = await this.api.me();
    const deviceId = await this.getOrCreateDeviceId();
    return {
      user: me.data.user,
      tenant: me.data.tenant,
      deviceId,
    };
  }

  async restoreSession(): Promise<MobileSession | null> {
    const [storedAccess, storedRefresh] = await Promise.all([
      this.storage.getItem(KEYS.ACCESS_TOKEN),
      this.storage.getItem(KEYS.REFRESH_TOKEN),
    ]);
    if (!storedAccess && !storedRefresh) return null;

    this.accessToken = storedAccess;
    this.refreshToken = storedRefresh;

    try {
      const me = await this.api.me();
      const deviceId = await this.getOrCreateDeviceId();
      return { user: me.data.user, tenant: me.data.tenant, deviceId };
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401 && this.refreshToken) {
        try {
          const refreshed = await this.api.refresh(this.refreshToken);
          this.accessToken = refreshed.data.accessToken;
          this.refreshToken = refreshed.data.refreshToken;
          await Promise.all([
            this.storage.setItem(KEYS.ACCESS_TOKEN, refreshed.data.accessToken),
            this.storage.setItem(KEYS.REFRESH_TOKEN, refreshed.data.refreshToken),
          ]);
          const me = await this.api.me();
          const deviceId = await this.getOrCreateDeviceId();
          return { user: me.data.user, tenant: me.data.tenant, deviceId };
        } catch {
          await this.clearTokens();
          this.onSessionExpired?.();
          return null;
        }
      }
      throw err;
    }
  }

  async logout(onWipeLocalData?: () => Promise<void> | void): Promise<void> {
    try {
      if (this.accessToken) {
        await this.api.logout();
      }
    } catch {
      // Proceed with local wipe even if offline during logout
    } finally {
      await this.clearTokens();
      if (onWipeLocalData) {
        await onWipeLocalData();
      }
    }
  }

  private async clearTokens(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    await Promise.all([
      this.storage.removeItem(KEYS.ACCESS_TOKEN),
      this.storage.removeItem(KEYS.REFRESH_TOKEN),
    ]);
  }
}
