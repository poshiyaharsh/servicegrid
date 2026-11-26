import crypto from 'node:crypto';
import type { SystemRole } from '@servicegrid/types';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  sessionId: string;
  roles: SystemRole[];
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;

  const expected = Buffer.from(keyHex, 'hex');
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });

  if (expected.length !== derived.length) return false;
  return crypto.timingSafeEqual(expected, derived);
}

export function generateOpaqueToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${pad}`, 'base64').toString('utf8');
}

export function signJwt(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  secret: string,
  ttlSeconds: number,
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = base64UrlEncode(
    crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest(),
  );
  return `${header}.${body}.${signature}`;
}

export function verifyJwt(token: string, secret: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT');
  }
  const [header, body, sig] = parts;
  if (!header || !body || !sig) {
    throw new Error('Malformed JWT');
  }

  const expectedSig = base64UrlEncode(
    crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest(),
  );
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error('Invalid JWT signature');
  }

  const decoded = JSON.parse(base64UrlDecode(body)) as JwtPayload;
  const now = Math.floor(Date.now() / 1000);
  if (decoded.exp <= now) {
    throw new Error('JWT expired');
  }
  return decoded;
}
