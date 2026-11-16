import * as crypto from 'crypto';

/**
 * SIMPU Two-Factor Authentication (2FA) Helper & Security Utilities
 * Strictly enforces that plaintext OTP codes are NEVER stored in DB or logs.
 * Supports:
 * 1) Email OTP (6-digit numeric, HMAC-SHA256 hashed, 10 min expiry)
 * 2) Google Authenticator / TOTP RFC 6238 (Base32 secret, 6-digit, 30s step, ±1 drift window)
 * 3) Flexible mode: 'email' | 'authenticator' | 'both'
 */

export const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes (Ketentuan 2)
export const OTP_MAX_ATTEMPTS = 5; // Maksimal 5 kali percobaan salah (Ketentuan 3)
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // Jeda 60 detik (Ketentuan 4)
export const OTP_MAX_RESENDS = 3; // Maksimal 3 kali per sesi login (Ketentuan 4)
export const TOTP_STEP_SECONDS = 30; // 30 detik per kode TOTP
export const TOTP_DRIFT_WINDOW = 1; // Toleransi ±1 window (30s) untuk clock drift

export type TwoFactorMethod = 'email' | 'authenticator' | 'both';

const OTP_SALT_SECRET = process.env.OTP_SALT_SECRET || 'simpu_secure_otp_salt_secret_2026_salt';
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Checks whether a given role or user requires Two-Factor Authentication (2FA).
 * Role khusus: Petugas (petugas, petugas_survey), Admin, dan Superadmin.
 */
export function isTwoFactorRole(role?: string, emailOrId?: string): boolean {
  if (!role && !emailOrId) return false;
  const r = (role || '').toLowerCase().trim();
  const id = (emailOrId || '').toLowerCase().trim();

  // Roles explicitly requiring 2FA
  if (
    r === 'petugas' ||
    r === 'petugas_survey' ||
    r === 'admin' ||
    r === 'administrator' ||
    r === 'superadmin'
  ) {
    return true;
  }

  // Hardcoded or primary admin identifiers
  if (id === 'agus' || id === 'agus@umkm.id') {
    return true;
  }

  return false;
}

/**
 * Masks an email address for privacy and security in UI displays.
 * Example: "budi.santoso@gmail.com" -> "b***o@gmail.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email || '';
  const parts = email.split('@');
  const localPart = parts[0];
  const domain = parts.slice(1).join('@');

  if (localPart.length <= 2) {
    return `${localPart[0]}*@${domain}`;
  }

  const firstChar = localPart[0];
  const lastChar = localPart[localPart.length - 1];
  const maskedMiddle = '*'.repeat(Math.min(6, Math.max(3, localPart.length - 2)));

  return `${firstChar}${maskedMiddle}${lastChar}@${domain}`;
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP code.
 * (Only passed directly to email sender and hashed; NEVER saved plaintext).
 */
export function generateOtpCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Hashes an OTP code with HMAC-SHA256 combined with user identifier and server secret.
 * This guarantees the plaintext OTP is NEVER stored in database or logs.
 */
export function hashOtpCode(code: string, identifier: string): string {
  const normalizedId = (identifier || '').toLowerCase().trim();
  const normalizedCode = (code || '').trim();
  return crypto
    .createHmac('sha256', OTP_SALT_SECRET)
    .update(`${normalizedId}:${normalizedCode}`)
    .digest('hex');
}

/**
 * Compares an input OTP code against the stored hash using timing-safe comparison
 * to protect against timing attacks.
 */
export function verifyOtpCode(inputCode: string, identifier: string, storedHash: string): boolean {
  if (!inputCode || !identifier || !storedHash) return false;
  const computed = hashOtpCode(inputCode, identifier);
  try {
    const bufA = Buffer.from(computed, 'utf8');
    const bufB = Buffer.from(storedHash, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// =============================================================================
// GOOGLE AUTHENTICATOR (RFC 6238 TOTP) IMPLEMENTATION
// =============================================================================

/**
 * Encodes a buffer into standard RFC 4648 Base32 string (without padding).
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/**
 * Decodes an RFC 4648 Base32 string back into a Buffer.
 * Ignores spaces, hyphens, and padding '='.
 */
export function base32Decode(str: string): Buffer {
  const cleaned = (str || '').toUpperCase().replace(/=+$/, '').replace(/[\s-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * Generates a random Base32 secret for Google Authenticator (default 20 bytes = 32 chars).
 */
export function generateTotpSecret(bytes = 20): string {
  const buf = crypto.randomBytes(bytes);
  return base32Encode(buf);
}

/**
 * Formats a Base32 secret into grouped 4-character chunks for user friendliness.
 * Example: "JBSWY3DPEHPK3PXP" -> "JBSW Y3DP EHPK 3PXP"
 */
export function formatSecretKey(secret: string): string {
  const clean = (secret || '').replace(/[\s-]/g, '').toUpperCase();
  return clean.match(/.{1,4}/g)?.join(' ') || clean;
}

/**
 * Constructs an otpauth:// URI recognized by Google Authenticator and Authy.
 */
export function generateTotpAuthUri(identifier: string, secretBase32: string, issuer = 'SIMPU'): string {
  const cleanId = (identifier || 'User').trim();
  const cleanSecret = (secretBase32 || '').replace(/[\s-]/g, '').toUpperCase();
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(`${issuer}:${cleanId}`);
  return `otpauth://totp/${encodedAccount}?secret=${cleanSecret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Calculates a 6-digit TOTP token for a given Base32 secret and timestamp.
 * Standard RFC 6238 with HMAC-SHA1 and 30-second window.
 */
export function generateTotpToken(secretBase32: string, timeSec = Math.floor(Date.now() / 1000)): string {
  const key = base32Decode(secretBase32);
  const counter = Math.floor(timeSec / TOTP_STEP_SECONDS);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1000000).toString().padStart(6, '0');
}

/**
 * Verifies a 6-digit Google Authenticator TOTP token.
 * Supports window = 1 (checks current 30s step, -30s, and +30s to tolerate clock drift).
 * Uses timing-safe string comparison.
 */
export function verifyTotpToken(token: string, secretBase32: string, window = TOTP_DRIFT_WINDOW): boolean {
  if (!token || !secretBase32) return false;
  const cleanToken = token.trim();
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  for (let w = -window; w <= window; w++) {
    const checkTime = nowSec + w * TOTP_STEP_SECONDS;
    const expected = generateTotpToken(secretBase32, checkTime);
    try {
      const bufA = Buffer.from(cleanToken, 'utf8');
      const bufB = Buffer.from(expected, 'utf8');
      if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
        return true;
      }
    } catch {
      // Continue check
    }
  }
  return false;
}
