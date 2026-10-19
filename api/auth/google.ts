import { randomState, oauthConfig, secureCookie, STATE_COOKIE, CALLBACK_URL } from './_oauth';
export default function handler(req: any, res: any) {
  if (req.method !== 'GET') { res.setHeader('Allow','GET'); return res.status(405).json({error:'Method not allowed'}); }
  try {
    const {clientId}=oauthConfig(); const state=randomState();
    const query=new URLSearchParams({client_id:clientId,redirect_uri:CALLBACK_URL,response_type:'code',scope:'openid email profile',state,prompt:'select_account'});
    res.setHeader('Cache-Control','no-store'); res.setHeader('Set-Cookie',secureCookie(STATE_COOKIE,state,600));
    return res.redirect(302,`https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`);
  } catch { res.setHeader('Cache-Control','no-store'); return res.status(503).send('Google sign-in is not configured on this deployment.'); }
}