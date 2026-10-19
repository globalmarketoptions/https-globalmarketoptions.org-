import { clearCookie, SESSION_COOKIE, STATE_COOKIE } from './_oauth';

export default function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  res.setHeader('Set-Cookie', [clearCookie(SESSION_COOKIE), clearCookie(STATE_COOKIE)]);
  return res.status(200).json({ ok: true });
}
