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
export function beginGoogle(config,now=Date.now(),returnState='') {
  for(const [key,value] of states) if(now-value.created>600000) states.delete(key);
  if(states.size>=400) throw new Error('Google sign-in is busy. Please try later.');
  const state=randomBytes(32).toString('hex'),nonce=randomBytes(32).toString('hex'),verifier=randomBytes(48).toString('base64url');
  states.set(state,{nonce,verifier,returnState,created:now});
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
export function googleStateCookie(req,secure=false) {
  const name=secure ? '__Host-franco_google_state=' : 'franco_google_state=';
  return String(req.headers.cookie || '').split(';').map(part=>part.trim()).find(part=>part.startsWith(name))?.slice(name.length) || '';
}
export function stateCookie(value,secure,clear=false) {
  const name=secure ? '__Host-franco_google_state' : 'franco_google_state';
  return `${name}=${value}; Path=${secure?'/' : '/api/auth/google'}; HttpOnly; SameSite=Lax; Max-Age=${clear?0:600}${secure?'; Secure':''}`;
}
export async function googleIdentity(config,code,record,client=new OAuth2Client(config.clientId,config.clientSecret,config.redirectUri)) {
  const {tokens}=await client.getToken({code,codeVerifier:record.verifier,redirect_uri:config.redirectUri});
  if(!tokens.id_token) throw new Error('Missing Google ID token.');
  // The established Google SDK verifies signature, issuer, expiry and audience.
  const ticket=await client.verifyIdToken({idToken:tokens.id_token,audience:config.clientId});
  const claims=ticket.getPayload();
  if(!claims || claims.nonce!==record.nonce || claims.email_verified!==true || typeof claims.email!=='string' || !claims.email.trim() || !claims.sub) throw new Error('Google identity could not be verified.');
  return {email:claims.email.trim().toLowerCase(),firstName:claims.given_name || claims.name?.split(' ')[0] || claims.email.split('@')[0],lastName:claims.family_name || null,sub:claims.sub};
}
export function googleReturn(config,value,error=false,returnState='') {
  // The fragment carries a short-lived single-use exchange code (or an error
  // code), never the session token: bearer tokens must not appear in URLs,
  // where they leak into history, server access logs, and telemetry.
  const url=new URL(config.frontendUrl);url.hash=new URLSearchParams({[error?'auth_error':'auth_code']:value,...(returnState?{auth_state:returnState}:{})}).toString();return url.href;
}

// SHA-256 hex of a handoff code. Codes are bearer-equivalent until consumed,
// so only the hash is stored; the raw code lives ~60 seconds in transit.
const hashAuthCode=value=>createHash('sha256').update(value).digest('hex');
export async function issueAuthCode(query,userId) {
  const code=randomBytes(32).toString('hex');
  await query("INSERT INTO oauth_codes(id,user_id,code_hash,expires_at) VALUES(?,?,?,NOW()+INTERVAL '60 seconds')",
    [randomBytes(16).toString('hex'),userId,hashAuthCode(code)]);
  return code;
}
export async function consumeAuthCode(query,code) {
  if(typeof code!=='string' || !/^[a-f0-9]{64}$/.test(code)) return null;
  const rows=await query('UPDATE oauth_codes SET used_at=NOW() WHERE code_hash=? AND used_at IS NULL AND expires_at>NOW() RETURNING user_id',[hashAuthCode(code)]);
  return rows.length ? rows[0].user_id : null;
}

export async function googleAccount(identity,{query,createProfileForUser,password}) {
  if(!identity.sub) throw new Error('Google identity could not be verified.');
  // Identity first: Google's sub is the stable account key. Email is a
  // mutable attribute — a user who changes their Google account email keeps
  // the same sub, so sub-first lookup never strands their data.
  let row=(await query('SELECT * FROM users WHERE google_sub=?',[identity.sub]))[0];
  if(row) {
    if(row.email!==identity.email) {
      // Google's current email for this sub is authoritative. Refuse only if
      // a *different* Franco account already owns the address.
      const clash=(await query('SELECT id FROM users WHERE email=? AND id<>?',[identity.email,row.id]))[0];
      if(clash) throw new Error('This Google account is already linked to another Franco account.');
      await query('UPDATE users SET email=?, email_verified=TRUE WHERE id=?',[identity.email,row.id]);
    } else if(!row.email_verified) {
      await query('UPDATE users SET email_verified=TRUE WHERE id=?',[row.id]);
    }
    await createProfileForUser(row.id);
    return row;
  }
  row=(await query('SELECT * FROM users WHERE email=?',[identity.email]))[0];
  if(!row) {
    // An inaccessible random password preserves the existing users contract;
    // password login cannot be guessed for a Google-created account.
    const id=randomBytes(16).toString('hex'),p=password(randomBytes(32).toString('hex'));
    try {
      await query('INSERT INTO users(id,email,name,first_name,last_name,password_hash,password_salt,email_verified,google_sub) VALUES(?,?,?,?,?,?,?,TRUE,?) ON CONFLICT(email) DO NOTHING',
        [id,identity.email,[identity.firstName,identity.lastName].filter(Boolean).join(' '),identity.firstName,identity.lastName,p.hash,p.salt,identity.sub]);
    } catch(insertError) {
      // Concurrent first-login race on google_sub (23505): the winner's row
      // is re-read below; the loser adopts it instead of 500ing.
      if(!insertError || insertError.code!=='23505') throw insertError;
    }
    row=(await query('SELECT * FROM users WHERE google_sub=?',[identity.sub]))[0]
      || (await query('SELECT * FROM users WHERE email=?',[identity.email]))[0];
    if(!row) throw new Error('Google account could not be created.');
  }
  if(row.google_sub!==identity.sub) {
    if(row.google_sub) {
      // A *different* Google identity already owns this account — e.g. a
      // Workspace admin reassigned this email address to a new hire. Never
      // silently re-link one human's account to another: fail closed. The
      // owner can still sign in with their original method.
      throw new Error('This account is already linked to a different Google account. Sign in with your original method or contact support.');
    }
    if(!row.email_verified) {
      // Pre-hijacking defense (FRA-57): this row was created by a password
      // signup that was never verified, so literally anyone could have typed
      // this address. The Google identity is the stronger proof of ownership,
      // so it claims the row — and the password is rotated to a fresh random
      // value, revoking whatever the unverified creator set. They never held
      // a session: password login requires email_verified.
      const p=password(randomBytes(32).toString('hex'));
      await query('UPDATE users SET password_hash=?, password_salt=?, email_verified=TRUE, google_sub=? WHERE id=?',[p.hash,p.salt,identity.sub,row.id]);
    } else {
      // Verified password account: the same human proved ownership twice
      // (inbox via verification link, Google via ID token). Link the sub.
      await query('UPDATE users SET google_sub=? WHERE id=?',[identity.sub,row.id]);
    }
    row=(await query('SELECT * FROM users WHERE id=?',[row.id]))[0];
  }
  await createProfileForUser(row.id);
  return row;
}
