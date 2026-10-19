import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
export const SITE_ORIGIN = 'https://globalmarketoptions.org';
export const CALLBACK_URL = `${SITE_ORIGIN}/api/auth/callback/google`;
export const SESSION_COOKIE = 'gmo_session';
export const STATE_COOKIE = 'gmo_oauth_state';
export function oauthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Google OAuth is not configured.');
  return { clientId, clientSecret };
}
export function cookieValue(req: any, name: string): string | undefined {
  const header = req.headers?.cookie;
  if (typeof header !== 'string') return undefined;
  for (const part of header.split(';')) { const [key, ...rest] = part.trim().split('='); if (key === name) return rest.join('='); }
  return undefined;
}
export function secureCompare(a: string, b: string): boolean {
  const aa = Buffer.from(a); const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export function sessionToken(payload: Record<string, unknown>, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}
export function verifySession(token: string, secret: string): Record<string, any> | null {
  const [encoded, signature, extra] = token.split('.');
  if (!encoded || !signature || extra) return null;
  const expected = createHmac('sha256', secret).update(encoded).digest('base64url');
  if (!secureCompare(signature, expected)) return null;
  try { const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); if (!payload || typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now()/1000)) return null; return payload; } catch { return null; }
}
export function randomState(): string { return randomBytes(32).toString('base64url'); }
export function secureCookie(name: string, value: string, maxAge: number): string { return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`; }
export function clearCookie(name: string): string { return `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`; }
