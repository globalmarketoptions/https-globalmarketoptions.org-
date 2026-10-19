import { createHmac } from 'node:crypto';
import { cookieValue, oauthConfig, SESSION_COOKIE, verifySession } from './_oauth';
import { prisma } from './_db';

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Cookie');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed' }); }
  try {
    const { clientSecret } = oauthConfig();
    const key = createHmac('sha256', clientSecret).update('globalmarketoptions-session-v1').digest().toString('base64url');
    const token = cookieValue(req, SESSION_COOKIE);
    const payload = token ? verifySession(token, key) : null;
    if (!payload || typeof payload.sub !== 'string' || typeof payload.sid !== 'string') return res.status(200).json({ user: null });
    const session = await prisma.authSession.findFirst({
      where: { id: payload.sid, userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!session) return res.status(200).json({ user: null });
    return res.status(200).json({ user: { userId: session.user.id, email: session.user.email, name: session.user.name } });
  } catch {
    return res.status(200).json({ user: null });
  }
}
