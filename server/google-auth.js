import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';

export function googleConfig(env = process.env) {
  const { GOOGLE_CLIENT_ID:clientId,GOOGLE_CLIENT_SECRET:clientSecret,GOOGLE_REDIRECT_URI:redirectUri,GOOGLE_FRONTEND_URL:frontendUrl }=env;
  if(!clientId || !clientSecret || !redirectUri || !frontendUrl) return null;
  try {
    const callback=new URL(redirectUri),frontend=new URL(frontendUrl);
    const allowed=url=>url.protocol==='https:' || (url.protocol==='http:' && ['localhost','127.0.0.1'].includes(url.hostname));
    if(!allowed(callback) || !allowed(frontend) || callback.username || callback.password || frontend.username || frontend.password || callback.pathname!=='/api/auth/google/callback') return null;
    return {clientId,clientSecret,redirectUri:callback.href,frontendUrl:frontend.href,secure:callback.protocol==='https:'};
  } catch {return null;}
}
const states=new Map();
export function beginGoogle(config,now=Date.now()) {
  for(const [key,value] of states) if(now-value.created>600000) states.delete(key);
  if(states.size>=400) throw new Error('Google sign-in is busy. Please try later.');
  const state=randomBytes(32).toString('hex'),nonce=randomBytes(32).toString('hex'),verifier=randomBytes(48).toString('base64url');
  states.set(state,{nonce,verifier,created:now});
  const client=new OAuth2Client(config.clientId,config.clientSecret,config.redirectUri);
  const url=client.generateAuthUrl({scope:['openid','email','profile'],state,nonce,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',prompt:'select_account'});
  return {state,url};
}
export function consumeGoogleState(state,cookie,now=Date.now()) {
  if(typeof state!=='string' || typeof cookie!=='string' || !/^[a-f0-9]{64}$/.test(state) || !/^[a-f0-9]{64}$/.test(cookie)) return null;
  if(!timingSafeEqual(Buffer.from(state),Buffer.from(cookie))) return null;
  const record=states.get(state);states.delete(state);
  if(!record || now-record.created>600000) return null;
  return record;
}
export function googleStateCookie(req) {
  return String(req.headers.cookie || '').split(';').map(part=>part.trim()).find(part=>part.startsWith('franco_google_state='))?.slice('franco_google_state='.length) || '';
}
export function stateCookie(value,secure,clear=false) {
  return `franco_google_state=${value}; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=${clear?0:600}${secure?'; Secure':''}`;
}
export async function googleIdentity(config,code,record,client=new OAuth2Client(config.clientId,config.clientSecret,config.redirectUri)) {
  const {tokens}=await client.getToken({code,codeVerifier:record.verifier,redirect_uri:config.redirectUri});
  if(!tokens.id_token) throw new Error('Missing Google ID token.');
  // The established Google SDK verifies signature, issuer, expiry and audience.
  const ticket=await client.verifyIdToken({idToken:tokens.id_token,audience:config.clientId});
  const claims=ticket.getPayload();
  if(!claims || claims.nonce!==record.nonce || claims.email_verified!==true || typeof claims.email!=='string' || !claims.email.trim() || !claims.sub) throw new Error('Google identity could not be verified.');
  return {email:claims.email.trim().toLowerCase(),firstName:claims.given_name || claims.name?.split(' ')[0] || claims.email.split('@')[0],lastName:claims.family_name || null};
}
export function googleReturn(config,value,error=false) {
  const url=new URL(config.frontendUrl);url.hash=new URLSearchParams({[error?'auth_error':'auth_token']:value}).toString();return url.href;
}

export async function googleAccount(identity,{query,createProfileForUser,password}) {
  let row=(await query('SELECT * FROM users WHERE email=?',[identity.email]))[0];
  if(!row) {
    // An inaccessible random password preserves the existing users contract;
    // password login cannot be guessed for a Google-created account.
    const id=randomBytes(16).toString('hex'),p=password(randomBytes(32).toString('hex'));
    await query('INSERT INTO users(id,email,name,first_name,last_name,password_hash,password_salt) VALUES(?,?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING',
      [id,identity.email,[identity.firstName,identity.lastName].filter(Boolean).join(' '),identity.firstName,identity.lastName,p.hash,p.salt]);
    row=(await query('SELECT * FROM users WHERE email=?',[identity.email]))[0];
  }
  if(!row) throw new Error('Google account could not be created.');
  await createProfileForUser(row.id);
  return row;
}
