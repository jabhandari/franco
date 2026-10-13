import assert from 'node:assert/strict';
import {googleConfig,beginGoogle,consumeGoogleState,stateCookie,googleIdentity,googleReturn,googleAccount,issueAuthCode,consumeAuthCode} from '../server/google-auth.js';
const env={GOOGLE_CLIENT_ID:'test-client',GOOGLE_CLIENT_SECRET:'test-secret',GOOGLE_REDIRECT_URI:'http://localhost:8787/api/auth/google/callback',GOOGLE_FRONTEND_URL:'http://localhost:5173/'};
const config=googleConfig(env);assert.ok(config);
assert.equal(googleConfig({}),null);assert.equal(googleConfig({...env,GOOGLE_FRONTEND_URL:'http://example.com'}),null);
const login=beginGoogle(config,1000);const url=new URL(login.url);
assert.equal(url.hostname,'accounts.google.com');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('state'),login.state);
assert.equal(consumeGoogleState(login.state,'0'.repeat(64),1100),null);
const record=consumeGoogleState(login.state,login.state,1100);assert.ok(record);assert.equal(consumeGoogleState(login.state,login.state,1100),null);
const expired=beginGoogle(config,1000);assert.equal(consumeGoogleState(expired.state,expired.state,602000),null);
assert.match(stateCookie(login.state,true),/HttpOnly; SameSite=Lax; Max-Age=600; Secure/);
const client={async getToken(options){assert.equal(options.codeVerifier,record.verifier);return {tokens:{id_token:'test-id-token'}};},async verifyIdToken(options){assert.equal(options.audience,'test-client');return {getPayload:()=>({nonce:record.nonce,email_verified:true,email:'MARIE@example.com',sub:'google-subject',given_name:'Marie',family_name:'Curie'})};}};
assert.deepEqual(await googleIdentity(config,'code',record,client),{email:'marie@example.com',firstName:'Marie',lastName:'Curie',sub:'google-subject'});
await assert.rejects(googleIdentity(config,'code',record,{...client,async verifyIdToken(){return {getPayload:()=>({nonce:'wrong',email_verified:true,email:'x@example.com',sub:'x'})};}}));
await assert.rejects(googleIdentity(config,'code',record,{...client,async verifyIdToken(){return {getPayload:()=>({nonce:record.nonce,email_verified:false,email:'x@example.com',sub:'x'})};}}));
assert.equal(new URL(googleReturn(config,'session')).hash,'#auth_code=session');
console.log('Google OAuth checks passed');

// --- FRA-57: separate silos — a Google identity resolves by sub only,
// never merges into a password row; email collisions point at the method ---
function fakeDb(rows) {
  const log=[];
  return { log, rows, async query(sql,params) {
    log.push([sql,params]);
    if (sql.startsWith('SELECT * FROM users WHERE google_sub=')) return rows.filter(r=>r.google_sub&&r.google_sub===params[0]);
    if (sql.startsWith('SELECT * FROM users WHERE email=')) return rows.filter(r=>r.email===params[0]);
    if (sql.startsWith('SELECT id FROM users WHERE email=')) {
      if (sql.includes('id<>?')) return rows.filter(r=>r.email===params[0]&&r.id!==params[1]).map(r=>({id:r.id}));
      return rows.filter(r=>r.email===params[0]).map(r=>({id:r.id}));
    }
    if (sql.startsWith('SELECT * FROM users WHERE id=')) return rows.filter(r=>r.id===params[0]);
    if (sql.startsWith('INSERT INTO users')) { rows.push({id:params[0],email:params[1],password_hash:params[5],password_salt:params[6],email_verified:true,google_sub:params[7]}); return []; }
    if (sql.startsWith('UPDATE users SET email=')) { const r=rows.find(x=>x.id===params[1]); r.email=params[0]; r.email_verified=true; return []; }
    if (sql.startsWith('UPDATE users SET email_verified=TRUE')) { rows.find(x=>x.id===params[0]).email_verified=true; return []; }
    throw new Error('unexpected query: '+sql);
  } };
}
const linkingServices=db=>({query:db.query,createProfileForUser:async()=>{},password:()=>({hash:'random-hash',salt:'random-salt'})});
const googleId={email:'marie@example.com',firstName:'Marie',lastName:'Curie',sub:'sub-1'};
const emailTaken=(e)=>e && e.code==='EMAIL_TAKEN';

// 1. Brand-new Google user: row created verified, linked, with an
//    inaccessible random password.
{
  const db=fakeDb([]);const row=await googleAccount(googleId,linkingServices(db));
  assert.equal(row.email,'marie@example.com');assert.equal(row.google_sub,'sub-1');assert.equal(row.email_verified,true);
  assert.equal(row.password_hash,'random-hash');assert.equal(db.log.filter(([s])=>s.startsWith('INSERT INTO users'))[0][1][7],'sub-1');
}
// 2. Verified password account + Google login with the same email: no merge.
//    The user is pointed at their password login; the row is untouched.
{
  const db=fakeDb([{id:'u1',email:'marie@example.com',password_hash:'user-secret',password_salt:'s',email_verified:true,google_sub:null}]);
  await assert.rejects(googleAccount(googleId,linkingServices(db)),emailTaken);
  assert.equal(db.rows[0].password_hash,'user-secret');assert.equal(db.rows[0].google_sub,null);
}
// 3. Unverified password row + Google login: still no merge. (Anyone can type
//    an address into a signup form — claiming it would be pre-hijacking.)
{
  const db=fakeDb([{id:'u2',email:'marie@example.com',password_hash:'attacker-secret',password_salt:'s',email_verified:false,google_sub:null}]);
  await assert.rejects(googleAccount(googleId,linkingServices(db)),emailTaken);
  assert.equal(db.rows[0].password_hash,'attacker-secret');assert.equal(db.rows[0].google_sub,null);
}
// 4. Google email change: sub-first lookup finds the row, adopts the new
//    Google-verified email instead of creating a duplicate.
{
  const rows=[{id:'u3',email:'old@example.com',password_hash:'random-hash',password_salt:'s',email_verified:true,google_sub:'sub-1'}];
  const db=fakeDb(rows);
  const row=await googleAccount({...googleId,email:'new@example.com'},linkingServices(db));
  assert.equal(row.id,'u3');assert.equal(rows[0].email,'new@example.com');assert.equal(rows.length,1);
}
// 5. Email change colliding with another account: fail closed, no merge.
{
  const rows=[
    {id:'u4',email:'a@example.com',password_hash:'random-hash',password_salt:'s',email_verified:true,google_sub:'sub-1'},
    {id:'u5',email:'b@example.com',password_hash:'h',password_salt:'s',email_verified:true,google_sub:null},
  ];
  const db=fakeDb(rows);
  await assert.rejects(googleAccount({...googleId,email:'b@example.com'},linkingServices(db)));
  assert.equal(rows[0].email,'a@example.com');
}
// 6. Already-linked account: straight through, no extra writes.
{
  const rows=[{id:'u6',email:'marie@example.com',password_hash:'h',password_salt:'s',email_verified:true,google_sub:'sub-1'}];
  const db=fakeDb(rows);const row=await googleAccount(googleId,linkingServices(db));
  assert.equal(row.id,'u6');assert.ok(!db.log.some(([s])=>s.startsWith('UPDATE users SET')));
}
// 7. Email reassignment: a *different* Google identity already owns this
//    address (e.g. Workspace admin recycled it). Sub-first lookup misses,
//    email hits — no silent re-link, just the "already exists" error.
{
  const rows=[{id:'u7',email:'marie@example.com',password_hash:'h',password_salt:'s',email_verified:true,google_sub:'sub-other'}];
  const db=fakeDb(rows);
  await assert.rejects(googleAccount(googleId,linkingServices(db)),emailTaken);
  assert.equal(db.rows[0].google_sub,'sub-other');
}
// 8. Concurrent first-login race: loser of the google_sub unique race
//    adopts the winner's row instead of 500ing.
{
  const winner={id:'u8',email:'marie@example.com',password_hash:'random-hash',password_salt:'s',email_verified:true,google_sub:'sub-1'};
  const db=fakeDb([]); // winner not yet committed at lookup time
  const racy={query:async(sql,params)=>{
    if(sql.startsWith('INSERT INTO users')){
      db.rows.push(winner); // winner commits between our lookups and insert
      const e=new Error('duplicate key value violates unique constraint "users_google_sub_uidx"');e.code='23505';throw e;
    }
    return db.query(sql,params);
  }};
  const row=await googleAccount(googleId,{...linkingServices(db),query:racy.query});
  assert.equal(row.id,'u8');
}
// 9. Lost race against a password signup for the same email: friendly
//    "already exists" error, not a 500.
{
  const passwordRow={id:'u9',email:'marie@example.com',password_hash:'h',password_salt:'s',email_verified:false,google_sub:null};
  const db=fakeDb([]);
  const racy={query:async(sql,params)=>{
    if(sql.startsWith('INSERT INTO users')){ db.rows.push(passwordRow); return []; } // ON CONFLICT(email) DO NOTHING
    return db.query(sql,params);
  }};
  await assert.rejects(googleAccount(googleId,{...linkingServices(db),query:racy.query}),emailTaken);
}
console.log('Google account-linking checks passed');

// --- FRA-57: single-use handoff codes ---
{
  const stored=new Map();
  const db={async query(sql,params){
    if (sql.startsWith('INSERT INTO oauth_codes')) { stored.set(params[2],{user_id:params[1],used:false}); return []; }
    if (sql.startsWith('UPDATE oauth_codes')) {
      const rec=stored.get(params[0]);
      if (!rec||rec.used) return [];
      rec.used=true;return [{user_id:rec.user_id}];
    }
    throw new Error('unexpected query: '+sql);
  }};
  const code=await issueAuthCode(db.query,'user-9');
  assert.match(code,/^[a-f0-9]{64}$/);
  assert.equal(await consumeAuthCode(db.query,code),'user-9');
  assert.equal(await consumeAuthCode(db.query,code),null); // single-use
  assert.equal(await consumeAuthCode(db.query,'0'.repeat(64)),null);
  assert.equal(await consumeAuthCode(db.query,'not-hex'),null);
}
console.log('Google handoff-code checks passed');

assert.match(stateCookie(login.state,true),/^__Host-franco_google_state=/);
assert.match(stateCookie(login.state,true),/Path=\/;/);

const returnState='a'.repeat(64);const bound=beginGoogle(config,1000,returnState);assert.equal(consumeGoogleState(bound.state,bound.state,1001).returnState,returnState);assert.equal(new URL(googleReturn(config,'token',false,returnState)).hash,'#auth_code=token&auth_state='+returnState);
