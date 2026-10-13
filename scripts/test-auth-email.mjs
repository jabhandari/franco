import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { authClientIp, frontendOrigin, hashEmailToken } from '../server/auth-email.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !['localhost','127.0.0.1'].includes(new URL(databaseUrl).hostname)) {
  throw new Error('TEST_DATABASE_URL must point to local PostgreSQL.');
}
const db=new Pool({connectionString:databaseUrl});
const mail = [];
const mailServer = createServer((req,res) => {
  let data=''; req.on('data',chunk=>data+=chunk); req.on('end',()=>{
    if(req.method!=='POST' || req.url!=='/emails') {res.writeHead(404).end();return;}
    mail.push(JSON.parse(data));res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({id:randomUUID()}));
  });
});
await new Promise(resolve=>mailServer.listen(0,'127.0.0.1',resolve));
const mailPort=mailServer.address().port;
const apiPort=30000+Math.floor(Math.random()*20000);
const api=spawn(process.execPath,['server/index.js'],{
  env:{...process.env,DATABASE_URL:databaseUrl,PORT:String(apiPort),HOST:'127.0.0.1',RESEND_API_KEY:'re_test',RESEND_BASE_URL:`http://127.0.0.1:${mailPort}`,EMAIL_FROM:'test@example.com',FRONTEND_URL:'http://localhost:5173'},
  stdio:['ignore','pipe','pipe'],
});
let apiErrors=''; api.stderr.on('data',chunk=>apiErrors+=chunk);
const root=`http://127.0.0.1:${apiPort}`;
async function post(path,data,origin) {const response=await fetch(root+path,{method:'POST',headers:{'content-type':'application/json',...(origin?{origin}:{})},body:JSON.stringify(data)});return {status:response.status,data:await response.json()};}
function tokenFromLastMail() {return new URL(mail.at(-1).text.match(/https?:\/\/\S+/)[0]).searchParams.get('token');}
const createdEmails=[];
const ipKey=hashEmailToken('ip:127.0.0.1');
try {
  let healthy=false;
  for(let i=0;i<100;i++) {if(api.exitCode!==null) break;try {const r=await fetch(root+'/api/health');if(r.ok){healthy=true;break;}}catch{} await new Promise(resolve=>setTimeout(resolve,100));}
  assert(healthy,`API did not start: ${apiErrors}`);
  await db.query('DELETE FROM auth_email_requests WHERE ip_hash=$1',[ipKey]);
  assert.equal(authClientIp({headers:{'x-forwarded-for':'fake, 203.0.113.5'},socket:{remoteAddress:'127.0.0.1'}},'render-service'),'203.0.113.5');
  assert.equal(authClientIp({headers:{'x-forwarded-for':'fake, 203.0.113.5'},socket:{remoteAddress:'127.0.0.1'}},''),'127.0.0.1');
  assert.equal(frontendOrigin('https://23b89305.franco-dsh.pages.dev'),'https://23b89305.franco-dsh.pages.dev');
  assert.equal(frontendOrigin('https://evil.pages.dev'),null);
  assert.equal(frontendOrigin('http://23b89305.franco-dsh.pages.dev'),null);
  const email=`fra58-${randomUUID()}@example.com`,password='StartingPass1';
  createdEmails.push(email);
  let r=await post('/api/auth/signup',{email,password,first_name:'Email',last_name:'Test'},'https://23b89305.franco-dsh.pages.dev');
  assert.equal(r.status,201,JSON.stringify(r));assert.equal(mail.length,1);
  assert.match(mail[0].text,/https:\/\/23b89305\.franco-dsh\.pages\.dev\/verify-email\?token=/);
  r=await post('/api/auth/login',{email,password});assert.equal(r.status,403);assert.equal(r.data.code,'email_not_verified');
  const verifyToken=tokenFromLastMail();
  const verifyRows=await db.query("SELECT token_hash,expires_at FROM email_tokens WHERE type='verify' AND user_id=(SELECT id FROM users WHERE email=$1)",[email]);
  assert.equal(verifyRows.rows.length,1);assert.notEqual(verifyRows.rows[0].token_hash,verifyToken);
  assert(Math.abs(new Date(verifyRows.rows[0].expires_at).getTime()-Date.now()-86400000)<60000);
  r=await post('/api/auth/verify-email',{token:verifyToken});assert.equal(r.status,200);
  r=await post('/api/auth/verify-email',{token:verifyToken});assert.equal(r.status,400);
  r=await post('/api/auth/login',{email,password});assert.equal(r.status,200);
  const oldSession=r.data.token;
  r=await post('/api/auth/forgot-password',{email});assert.equal(r.status,200);assert.equal(mail.length,2);
  const resetToken=tokenFromLastMail();
  const resetRows=await db.query("SELECT token_hash,expires_at FROM email_tokens WHERE type='reset' AND user_id=(SELECT id FROM users WHERE email=$1)",[email]);
  assert.equal(resetRows.rows.length,1);assert.notEqual(resetRows.rows[0].token_hash,resetToken);
  assert(Math.abs(new Date(resetRows.rows[0].expires_at).getTime()-Date.now()-3600000)<60000);
  r=await post('/api/auth/forgot-password',{email});assert.equal(r.status,200);assert.equal(mail.length,3);
  const secondResetToken=tokenFromLastMail();
  r=await post('/api/auth/reset-password',{token:resetToken,password:'ReplacementPass2'});assert.equal(r.status,200);
  r=await post('/api/auth/reset-password',{token:resetToken,password:'ReplacementPass3'});assert.equal(r.status,400);
  r=await post('/api/auth/reset-password',{token:secondResetToken,password:'ReplacementPass3'});assert.equal(r.status,400);
  const oldMe=await fetch(root+'/api/me',{headers:{authorization:`Bearer ${oldSession}`}});assert.equal(oldMe.status,401);
  r=await post('/api/auth/login',{email,password});assert.equal(r.status,401);
  r=await post('/api/auth/login',{email,password:'ReplacementPass2'});assert.equal(r.status,200);
  const unknown=`missing-${randomUUID()}@example.com`;
  r=await post('/api/auth/forgot-password',{email:unknown});assert.equal(r.status,200);assert.deepEqual(r.data,(await post('/api/auth/resend-verification',{email:unknown})).data);
  const before=mail.length;
  for(let i=0;i<7;i++) assert.equal((await post('/api/auth/forgot-password',{email})).status,200);
  assert.equal(mail.length,before+3); // two earlier reset requests consumed the other slots.
  await db.query('DELETE FROM auth_email_requests WHERE ip_hash=$1',[ipKey]);
  for(let i=0;i<6;i++){
    const signupEmail=`signup-cap-${randomUUID()}@example.com`;
    const result=await post('/api/auth/signup',{email:signupEmail,password,first_name:'Email',last_name:'Test'});
    assert.equal(result.status,i<5?201:429);
    if(i<5) createdEmails.push(signupEmail);
  }
  await db.query('DELETE FROM auth_email_requests WHERE ip_hash=$1',[ipKey]);
  for(let i=0;i<25;i++) assert.equal((await post(i%2?'/api/auth/forgot-password':'/api/auth/resend-verification',{email:`unique-${randomUUID()}@example.com`})).status,200);
  assert.equal((await db.query('SELECT COUNT(*)::int AS count FROM auth_email_requests WHERE ip_hash=$1',[ipKey])).rows[0].count,20);
  const noMailPort=apiPort+1;
  const noMailApi=spawn(process.execPath,['server/index.js'],{env:{...process.env,DATABASE_URL:databaseUrl,PORT:String(noMailPort),HOST:'127.0.0.1',RESEND_API_KEY:'',FRONTEND_URL:'http://localhost:5173'},stdio:'ignore'});
  try {
    let ready=false;
    for(let i=0;i<100;i++){try{if((await fetch(`http://127.0.0.1:${noMailPort}/api/health`)).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
    assert(ready,'API without mail key did not start');
    const options={method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email})};
    const missing=await fetch(`http://127.0.0.1:${noMailPort}/api/auth/resend-verification`,options);
    assert.equal(missing.status,503);assert.equal((await missing.json()).code,'email_unavailable');
    const newEmail=`no-mail-${randomUUID()}@example.com`;
    const blocked=await fetch(`http://127.0.0.1:${noMailPort}/api/auth/signup`,{...options,body:JSON.stringify({email:newEmail,password,first_name:'Email',last_name:'Test'})});
    assert.equal(blocked.status,503);
    assert.equal((await db.query('SELECT id FROM users WHERE email=$1',[newEmail])).rows.length,0);
  } finally {if(noMailApi.exitCode===null){noMailApi.kill();await new Promise(resolve=>noMailApi.once('exit',resolve));}}
  console.log('Auth email integration OK: verify, replay, login gate, reset, session revocation, generic responses, rate limits, preview links, missing-key error.');
} finally {
  try {
    if(createdEmails.length) await db.query('DELETE FROM users WHERE email = ANY($1)',[createdEmails]);
    await db.query('DELETE FROM auth_email_requests WHERE ip_hash=$1',[ipKey]);
  } finally {
    await db.end();
    if(api.exitCode===null) {api.kill(); await new Promise(resolve=>api.once('exit',resolve));}
    await new Promise(resolve=>mailServer.close(resolve));
  }
}
