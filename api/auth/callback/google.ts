import { createHmac } from 'node:crypto';
import { clearCookie, cookieValue, oauthConfig, secureCookie, secureCompare, sessionToken, SESSION_COOKIE, STATE_COOKIE, CALLBACK_URL, SITE_ORIGIN } from '../_oauth';
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') { res.setHeader('Allow','GET'); return res.status(405).json({error:'Method not allowed'}); }
  const clearState=clearCookie(STATE_COOKIE);
  try {
    const {clientId,clientSecret}=oauthConfig();
    const code=typeof req.query?.code==='string'?req.query.code:'';
    const returnedState=typeof req.query?.state==='string'?req.query.state:'';
    const storedState=cookieValue(req,STATE_COOKIE)||'';
    if (!code || !returnedState || !storedState || !secureCompare(returnedState,storedState)) {
      res.setHeader('Set-Cookie',[clearState,clearCookie(SESSION_COOKIE)]); return res.redirect(302,`${SITE_ORIGIN}/#/login`);
    }
    const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:new URLSearchParams({code,client_id:clientId,client_secret:clientSecret,redirect_uri:CALLBACK_URL,grant_type:'authorization_code'})});
    const tokens=await tokenResponse.json().catch(()=>({})) as Record<string,any>;
    if (!tokenResponse.ok || typeof tokens.access_token!=='string' || typeof tokens.id_token!=='string') { res.setHeader('Set-Cookie',clearState); return res.redirect(302,`${SITE_ORIGIN}/#/login`); }
    const profileResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${tokens.access_token}`,Accept:'application/json'}});
    const profile=await profileResponse.json().catch(()=>({})) as Record<string,any>;
    if (!profileResponse.ok || typeof profile.sub!=='string' || typeof profile.email!=='string' || profile.email_verified!==true) { res.setHeader('Set-Cookie',clearState); return res.redirect(302,`${SITE_ORIGIN}/#/login`); }
    const now=Math.floor(Date.now()/1000);
    const payload={sub:profile.sub,email:profile.email,name:typeof profile.name==='string'?profile.name:'',iat:now,exp:now+60*60*8};
    const key=createHmac('sha256',clientSecret).update('globalmarketoptions-session-v1').digest().toString('base64url');
    const token=sessionToken(payload,key);
    res.setHeader('Cache-Control','no-store'); res.setHeader('Set-Cookie',[secureCookie(SESSION_COOKIE,token,60*60*8),clearState]);
    return res.redirect(302,`${SITE_ORIGIN}/#/dashboard`);
  } catch { res.setHeader('Set-Cookie',clearState); return res.redirect(302,`${SITE_ORIGIN}/#/login`); }
}