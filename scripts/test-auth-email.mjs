import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

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
async function post(path,data) {const response=await fetch(root+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});return {status:response.status,data:await response.json()};}
function tokenFromLastMail() {return new URL(mail.at(-1).text.match(/https?:\/\/\S+/)[0]).searchParams.get('token');}
let createdEmail=null;
try {
  let healthy=false;
  for(let i=0;i<100;i++) {if(api.exitCode!==null) break;try {const r=await fetch(root+'/api/health');if(r.ok){healthy=true;break;}}catch{} await new Promise(resolve=>setTimeout(resolve,100));}
  assert(healthy,`API did not start: ${apiErrors}`);
  const email=`fra58-${randomUUID()}@example.com`,password='StartingPass1';
  createdEmail=email;
  let r=await post('/api/auth/signup',{email,password,first_name:'Email',last_name:'Test'});
  assert.equal(r.status,201,JSON.stringify(r));assert.equal(mail.length,1);
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
  r=await post('/api/auth/reset-password',{token:resetToken,password:'ReplacementPass2'});assert.equal(r.status,200);
  r=await post('/api/auth/reset-password',{token:resetToken,password:'ReplacementPass3'});assert.equal(r.status,400);
  const oldMe=await fetch(root+'/api/me',{headers:{authorization:`Bearer ${oldSession}`}});assert.equal(oldMe.status,401);
  r=await post('/api/auth/login',{email,password});assert.equal(r.status,401);
  r=await post('/api/auth/login',{email,password:'ReplacementPass2'});assert.equal(r.status,200);
  const unknown=`missing-${randomUUID()}@example.com`;
  r=await post('/api/auth/forgot-password',{email:unknown});assert.equal(r.status,200);assert.deepEqual(r.data,(await post('/api/auth/resend-verification',{email:unknown})).data);
  const before=mail.length;
  for(let i=0;i<7;i++) assert.equal((await post('/api/auth/forgot-password',{email})).status,200);
  assert.equal(mail.length,before+4); // first request above consumed one of five hourly slots.
  console.log('Auth email integration OK: verify, replay, login gate, reset, session revocation, generic responses, rate limit.');
} finally {
  try { if(createdEmail) await db.query('DELETE FROM users WHERE email=$1',[createdEmail]); } finally {
    await db.end();
    if(api.exitCode===null) {api.kill(); await new Promise(resolve=>api.once('exit',resolve));}
    await new Promise(resolve=>mailServer.close(resolve));
  }
}
