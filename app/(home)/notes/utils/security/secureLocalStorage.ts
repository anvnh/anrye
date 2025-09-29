import { encryptSensitiveData, decryptSensitiveData, generateEncryptionPassword, isEncryptedData } from './encryption';

/**
 * Secure localStorage helpers for JSON payloads.
 * - Always encrypts when writing
 * - Transparently decrypts when reading
 * - Migrates existing plaintext values to encrypted format
 */
export const secureLocalStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      if (isEncryptedData(raw)) {
        const password = generateEncryptionPassword();
        const decrypted = await decryptSensitiveData(raw, password);
        return decrypted;
      }
      // Plaintext fallback
      return raw;
    } catch (e) {
      // As a last resort, try legacy stored password (if any)
      try {
        const legacy = localStorage.getItem('encryption-password');
        if (legacy && isEncryptedData(raw)) {
          const decrypted = await decryptSensitiveData(raw, legacy);
          return decrypted;
        }
      } catch {}
      console.error('secureLocalStorage.getItem failed for key', key, e);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
      const password = generateEncryptionPassword();
      const encrypted = await encryptSensitiveData(value, password);
      localStorage.setItem(key, encrypted);
    } catch (e) {
      console.error('secureLocalStorage.setItem failed for key', key, e);
    }
  },

  getJSON: async <T = unknown>(key: string): Promise<T | null> => {
    const raw = await secureLocalStorage.getItem(key);
    if (!raw) return null;
    try {
      // If encrypted, raw is plain JSON after decryption
      if (isEncryptedData(raw)) {
        // Should not happen because getItem would have decrypted already, but keep safe
        const password = generateEncryptionPassword();
        const decrypted = await decryptSensitiveData(raw, password);
        return JSON.parse(decrypted) as T;
      }
      return JSON.parse(raw) as T;
    } catch (e) {
      // If stored as plain string (not JSON), attempt to parse gracefully
      try {
        return JSON.parse(String(raw)) as T;
      } catch {}
      console.error('secureLocalStorage.getJSON failed for key', key, e);
      return null;
    }
  },

  setJSON: async (key: string, value: unknown): Promise<void> => {
    await secureLocalStorage.setItem(key, JSON.stringify(value ?? null));
  },

  migrateIfPlaintext: async (key: string): Promise<void> => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      if (!isEncryptedData(raw)) {
        const password = generateEncryptionPassword();
        const encrypted = await encryptSensitiveData(raw, password);
        localStorage.setItem(key, encrypted);
      }
    } catch (e) {
      console.error('secureLocalStorage.migrateIfPlaintext failed for key', key, e);
    }
  }
};
