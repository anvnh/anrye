import { createHash, randomBytes, pbkdf2Sync, createCipher, createDecipher } from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const ITERATIONS = 100000; // PBKDF2 iterations

export interface EncryptedData {
  data: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  salt: string; // Base64 encoded salt
  tag: string; // Base64 encoded authentication tag
  algorithm: string;
  iterations: number;
}

export interface EncryptionResult {
  success: boolean;
  data?: EncryptedData;
  error?: string;
}

export interface DecryptionResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Derives a key from password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypts a note content with a password
 * @param content - The note content to encrypt
 * @param password - The password to use for encryption
 * @returns Promise<EncryptionResult>
 */
export async function encryptNote(content: string, password: string): Promise<EncryptionResult> {
  try {
    if (!content || !password) {
      return {
        success: false,
        error: 'Content and password are required'
      };
    }

    // Generate random salt and IV
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);
    
    // Derive key from password
    const key = deriveKey(password, salt);
    
    // Use Web Crypto API if available (browser), otherwise use Node.js crypto
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      // Browser implementation
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        new Uint8Array(key),
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(iv),
        },
        cryptoKey,
        new TextEncoder().encode(content)
      );

      const encryptedArray = new Uint8Array(encrypted);
      const data = encryptedArray.slice(0, -TAG_LENGTH);
      const tag = encryptedArray.slice(-TAG_LENGTH);

      return {
        success: true,
        data: {
          data: Buffer.from(data).toString('base64'),
          iv: iv.toString('base64'),
          salt: salt.toString('base64'),
          tag: Buffer.from(tag).toString('base64'),
          algorithm: ALGORITHM,
          iterations: ITERATIONS
        }
      };
    } else {
      // Node.js implementation - using simple AES-256-CBC for compatibility
      const crypto = await import('crypto');
      const cipher = crypto.createCipher('aes-256-cbc', key.toString('hex'));
      
      let encrypted = cipher.update(content, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      return {
        success: true,
        data: {
          data: encrypted,
          iv: iv.toString('base64'),
          salt: salt.toString('base64'),
          tag: '', // Not used in CBC mode
          algorithm: 'aes-256-cbc',
          iterations: ITERATIONS
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Encryption failed'
    };
  }
}

/**
 * Decrypts an encrypted note with a password
 * @param encryptedData - The encrypted data object
 * @param password - The password to use for decryption
 * @returns Promise<DecryptionResult>
 */
export async function decryptNote(encryptedData: EncryptedData, password: string): Promise<DecryptionResult> {
  try {
    if (!encryptedData || !password) {
      return {
        success: false,
        error: 'Encrypted data and password are required'
      };
    }

    // Parse the encrypted data
    const data = Buffer.from(encryptedData.data, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const salt = Buffer.from(encryptedData.salt, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');

    // Derive key from password
    const key = deriveKey(password, salt);

    // Use Web Crypto API if available (browser), otherwise use Node.js crypto
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      // Browser implementation
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        new Uint8Array(key),
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      const encryptedBuffer = new Uint8Array([...data, ...tag]);
      
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(iv),
        },
        cryptoKey,
        encryptedBuffer
      );

      return {
        success: true,
        data: new TextDecoder().decode(decrypted)
      };
    } else {
      // Node.js implementation - using simple AES-256-CBC for compatibility
      const crypto = await import('crypto');
      
      if (encryptedData.algorithm === 'aes-256-cbc') {
        const decipher = crypto.createDecipher('aes-256-cbc', key.toString('hex'));
        let decrypted = decipher.update(encryptedData.data, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        return {
          success: true,
          data: decrypted
        };
      } else {
        return {
          success: false,
          error: 'Unsupported encryption algorithm for Node.js environment'
        };
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Decryption failed'
    };
  }
}

/**
 * Creates a hash of the password for verification purposes
 * @param password - The password to hash
 * @returns string - The hashed password
 */
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

/**
 * Verifies if a password matches the given hash
 * @param password - The password to verify
 * @param hash - The hash to compare against
 * @returns boolean - Whether the password matches
 */
export function verifyPassword(password: string, hash: string): boolean {
  const passwordHash = hashPassword(password);
  return passwordHash === hash;
}

/**
 * Generates a secure random password
 * @param length - The length of the password (default: 16)
 * @returns string - The generated password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  const bytes = randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length];
  }
  
  return password;
}

/**
 * Estimates the strength of a password
 * @param password - The password to evaluate
 * @returns object - Password strength information
 */
export function evaluatePasswordStrength(password: string): {
  score: number; // 0-4
  feedback: string[];
  strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong';
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score++;
  else feedback.push('Password should be at least 8 characters long');

  if (password.length >= 12) score++;
  else if (password.length >= 8) feedback.push('Consider using 12 or more characters');

  if (/[a-z]/.test(password)) score++;
  else feedback.push('Add lowercase letters');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Add uppercase letters');

  if (/[0-9]/.test(password)) score++;
  else feedback.push('Add numbers');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push('Add special characters');

  // Adjust score based on length and complexity
  if (password.length >= 16) score++;
  if (score > 4) score = 4;

  const strengthMap = {
    0: 'very-weak' as const,
    1: 'weak' as const,
    2: 'fair' as const,
    3: 'good' as const,
    4: 'strong' as const,
  };

  return {
    score,
    feedback,
    strength: strengthMap[score as keyof typeof strengthMap]
  };
}

/**
 * Utility functions for file encryption
 */
export const encryptionUtils = {
  encryptNote,
  decryptNote,
  hashPassword,
  verifyPassword,
  generateSecurePassword,
  evaluatePasswordStrength,
};
