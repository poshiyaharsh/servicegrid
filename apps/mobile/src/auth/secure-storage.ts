/**
 * Secure token storage abstraction for FieldSutra Mobile.
 * Production Android builds must bind this interface to Android Keystore /
 * EncryptedSharedPreferences (never plain AsyncStorage or unencrypted files).
 */
export interface SecureTokenStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clearAll(): Promise<void>;
}

/**
 * In-memory secure storage for automated tests and ephemeral sessions.
 */
export class InMemorySecureStorage implements SecureTokenStorage {
  private readonly store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clearAll(): Promise<void> {
    this.store.clear();
  }
}
