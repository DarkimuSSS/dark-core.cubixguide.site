import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SECRET_SALT || 'dark_core_cubixguide_secure_jwt_secret_key_2026';

function base64UrlEncode(str: string | Buffer): string {
  const buf = Buffer.isBuffer(str) ? str : Buffer.from(str);
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export interface JwtPayload {
  username: string;
  isAdmin?: boolean;
  role?: string;
  exp?: number;
  [key: string]: any;
}

/**
 * Sign payload to create JWT token (valid for 7 days by default)
 */
export function signJwt(payload: JwtPayload, expiresInSeconds = 7 * 24 * 60 * 60): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest();
  
  const encodedSignature = base64UrlEncode(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Verify JWT token signature and expiration
 */
export function verifyJwt(token: string): JwtPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  try {
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = base64UrlEncode(
      crypto.createHmac('sha256', JWT_SECRET).update(signatureInput).digest()
    );

    if (encodedSignature !== expectedSignature) {
      return null;
    }

    const payloadStr = base64UrlDecode(encodedPayload);
    const payload: JwtPayload = JSON.parse(payloadStr);

    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null; // Expired token
    }

    return payload;
  } catch (e) {
    return null;
  }
}
