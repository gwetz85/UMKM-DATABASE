/**
 * TOTP (Time-Based One-Time Password) & 2FA Helper
 * Implements RFC 6238 (TOTP) and RFC 4226 (HOTP) using standard Web Crypto API.
 * Compatible with Google Authenticator, Microsoft Authenticator, Authy, etc.
 * Zero external dependencies.
 */

// RFC 4648 Base32 alphabet
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a cryptographically secure random Base32 secret string.
 * @param length Secret key length (default 20 characters, 100 bits of entropy)
 */
export function generateTotpSecret(length: number = 20): string {
  const bytes = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += BASE32_CHARS[bytes[i] % BASE32_CHARS.length];
  }
  return secret;
}

/**
 * Convert Base32 string to Uint8Array bytes.
 */
export function base32ToBytes(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/[\s=-]/g, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;

  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) continue;
    buffer = (buffer << 5) | val;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      bytes.push((buffer >> bitsLeft) & 0xff);
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Convert counter integer into 8-byte big-endian Uint8Array.
 */
function counterToBytes(counter: number): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  view.setUint32(0, high);
  view.setUint32(4, low);
  return new Uint8Array(buffer);
}

/**
 * Compute HMAC-SHA1 signature using standard Web Cryptography API.
 */
async function hmacSha1(keyBytes: Uint8Array, messageBytes: Uint8Array): Promise<Uint8Array> {
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('Web Crypto API (crypto.subtle) tidak tersedia pada environment ini.');
  }

  const cryptoKey = await cryptoObj.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'HMAC', hash: { name: 'SHA-1' } },
    false,
    ['sign']
  );

  const signature = await cryptoObj.subtle.sign('HMAC', cryptoKey, messageBytes as unknown as BufferSource);
  return new Uint8Array(signature);
}

/**
 * Generate 6-digit TOTP code for a specific counter value.
 */
export async function generateTotpForCounter(secret: string, counter: number): Promise<string> {
  const keyBytes = base32ToBytes(secret);
  const counterBytes = counterToBytes(counter);
  const hmac = await hmacSha1(keyBytes, counterBytes);

  // Dynamic truncation (RFC 4226)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Generate current 6-digit TOTP token.
 * @param secret Base32 secret string
 * @param timeStepSeconds Time window duration (standard: 30 seconds)
 * @param offsetSteps Optional step offset for drift checking
 */
export async function generateTotpToken(
  secret: string,
  timeStepSeconds: number = 30,
  offsetSteps: number = 0
): Promise<string> {
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / timeStepSeconds) + offsetSteps;
  return generateTotpForCounter(secret, counter);
}

/**
 * Verify user's 6-digit TOTP token with time drift tolerance.
 * @param token 6-digit code entered by user
 * @param secret Base32 secret stored in database
 * @param toleranceSteps Window tolerance (-1, 0, +1 step = +/- 30s)
 * @param timeStepSeconds Standard step duration (30 seconds)
 */
export async function verifyTotpToken(
  token: string,
  secret: string,
  toleranceSteps: number = 1,
  timeStepSeconds: number = 30
): Promise<boolean> {
  if (!token || !secret) return false;
  const cleanToken = token.trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanToken)) return false;

  const epoch = Math.floor(Date.now() / 1000);
  const currentCounter = Math.floor(epoch / timeStepSeconds);

  for (let offset = -toleranceSteps; offset <= toleranceSteps; offset++) {
    try {
      const expected = await generateTotpForCounter(secret, currentCounter + offset);
      if (expected === cleanToken) {
        return true;
      }
    } catch (e) {
      console.error('Error calculating TOTP token:', e);
    }
  }

  return false;
}

/**
 * Generate standard OTPAuth URL for Google Authenticator QR Code.
 * Example: otpauth://totp/SIMPU%20UMKM:username?secret=JBSWY3DPEHPK3PXP&issuer=SIMPU%20UMKM&algorithm=SHA1&digits=6&period=30
 */
export function getOtpAuthUrl(secret: string, accountName: string, issuer: string = 'SIMPU UMKM'): string {
  const cleanAccount = encodeURIComponent(accountName.trim());
  const cleanIssuer = encodeURIComponent(issuer.trim());
  const cleanSecret = secret.replace(/\s+/g, '').toUpperCase();
  return `otpauth://totp/${cleanIssuer}:${cleanAccount}?secret=${cleanSecret}&issuer=${cleanIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate a QR Code image URL for scanning with Authenticator apps.
 */
export function getQrCodeImageUrl(otpAuthUrl: string, size: number = 220): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=2&data=${encodeURIComponent(otpAuthUrl)}`;
}

/**
 * Generate backup / recovery codes.
 * Returns formatted 8-character codes like ["A3B2-9F1C", ...].
 */
export function generateBackupCodes(count: number = 6): string[] {
  const codes: string[] = [];
  const chars = '0123456789ABCDEF';
  for (let i = 0; i < count; i++) {
    let p1 = '';
    let p2 = '';
    for (let j = 0; j < 4; j++) {
      p1 += chars[Math.floor(Math.random() * chars.length)];
      p2 += chars[Math.floor(Math.random() * chars.length)];
    }
    codes.push(`${p1}-${p2}`);
  }
  return codes;
}

/**
 * Verify and consume a backup code.
 * If valid, returns valid: true and remaining codes with the consumed code removed.
 */
export function verifyAndConsumeBackupCode(
  inputCode: string,
  backupCodes: string[] = []
): { valid: boolean; remainingCodes: string[] } {
  if (!inputCode || !backupCodes || backupCodes.length === 0) {
    return { valid: false, remainingCodes: backupCodes || [] };
  }

  const normalizedInput = inputCode.trim().toUpperCase().replace(/[\s-]/g, '');
  const matchIndex = backupCodes.findIndex((c) => {
    const norm = c.trim().toUpperCase().replace(/[\s-]/g, '');
    return norm === normalizedInput;
  });

  if (matchIndex === -1) {
    return { valid: false, remainingCodes: backupCodes };
  }

  const remainingCodes = backupCodes.filter((_, idx) => idx !== matchIndex);
  return { valid: true, remainingCodes };
}
