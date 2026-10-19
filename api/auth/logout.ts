import { createHmac } from 'node:crypto';
import { clearCookie, cookieValue, oauthConfig, SESSION_COOKIE, STATE_COOKIE, verifySession } from './_oauth';
import { prisma } from './_db';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { clientSecret } = oauthConfig();
    const key = createHmac('sha256', clientSecret).update('globalmarketoptions-session-v1').digest().toString('base64url');
    const token = cookieValue(req, SESSION_COOKIE);
    const payload = token ? verifySession(token, key) : null;
    if (payload && typeof payload.sid === 'string') {
      await prisma.authSession.updateMany({ where: { id: payload.sid, revokedAt: null }, data: { revokedAt: new Date() } });
    }
  } catch {
    // Always clear the browser cookies even if the database is temporarily unavailable.
  }
  res.setHeader('Set-Cookie', [clearCookie(SESSION_COOKIE), clearCookie(STATE_COOKIE)]);
  return res.status(200).json({ ok: true });
}
