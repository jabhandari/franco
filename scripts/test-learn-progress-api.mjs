import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
const url=process.env.TEST_DATABASE_URL;
if(!url || !['localhost','127.0.0.1'].includes(new URL(url).hostname)) throw new Error('TEST_DATABASE_URL must point to local PostgreSQL.');
const db=new Pool({connectionString:url});
const port=32000+Math.floor(Math.random()*10000), root=`http://127.0.0.1:${port}`;
const api=spawn(process.execPath,['server/index.js'],{env:{...process.env,DATABASE_URL:url,PORT:String(port),HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
let log='';api.stdout.on('data',c=>log+=c);api.stderr.on('data',c=>log+=c);
const id=`learn-test-${randomUUID()}`,token=randomUUID(),other=randomUUID();
const topics=[`${id}-A1`,`${id}-A2`];
async function call(path,body,auth=token) { const r=await fetch(root+path,{method:body?'POST':'GET',headers:{...(auth?{authorization:`Bearer ${auth}`} : {}),'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()}; }
try {
 let healthy=false;for(let i=0;i<150;i++){if(api.exitCode!==null)break;try{if((await fetch(root+'/api/health')).ok){healthy=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert(healthy,log);
 // Fresh local DB boot must have created the new table.
 assert.equal((await db.query("SELECT to_regclass('public.learner_subtopic_progress') AS name")).rows[0].name,'learner_subtopic_progress');
 for(const [n,t] of [token,other].entries()) {
  const uid=id+n;await db.query('INSERT INTO users(id,email,name,password_hash,password_salt) VALUES($1,$2,$3,$4,$5)',[uid,uid+'@example.test','Learn Test','unused','unused']);
  await db.query("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '1 hour')",[randomUUID(),uid,createHash('sha256').update(t).digest('hex')]);
 }
 for(const [i,topic] of topics.entries()) await db.query("INSERT INTO concepts(id,slug,title,concept_type,level_code,metadata_json) VALUES($1,$1,'Test','grammar',$2,$3)",[topic,i?'A2':'A1',{subtopics:[{subtopic_id:topic+'-1',title:'Real subtopic'}]}]);
 assert.deepEqual(await call('/api/me/learn/progress?level=A1'),{status:200,body:{level:'A1',subtopics:[]}});
 for(const path of ['/api/me/learn/progress','/api/me/learn/progress?level=no']) assert.equal((await call(path)).status,400);
 assert.equal((await call('/api/me/learn/progress?level=A1',null,null)).status,401);
 const input={topic_id:topics[0],subtopic_id:topics[0]+'-1',status:'in_progress'};
 assert.equal((await call('/api/me/learn/progress',input,null)).status,401);
 assert.deepEqual(await call('/api/me/learn/progress',input),{status:200,body:{saved:true}});
 let rows=(await call('/api/me/learn/progress?level=A1')).body.subtopics;assert.equal(rows[0].status,'in_progress');assert.ok(Date.parse(rows[0].updated_at));
 await call('/api/me/learn/progress',{...input,status:'completed'});await call('/api/me/learn/progress',input);
 assert.equal((await call('/api/me/learn/progress?level=A1')).body.subtopics[0].status,'completed');
 await Promise.all([call('/api/me/learn/progress',input),call('/api/me/learn/progress',{...input,status:'completed'})]);
 assert.equal((await call('/api/me/learn/progress?level=A1')).body.subtopics[0].status,'completed');
 await call('/api/me/learn/progress',{topic_id:topics[1],subtopic_id:topics[1]+'-1',status:'in_progress'});
 assert.equal((await call('/api/me/learn/progress?level=A1')).body.subtopics.length,1);assert.equal((await call('/api/me/learn/progress?level=A2')).body.subtopics[0].topic_id,topics[1]);
 assert.deepEqual((await call('/api/me/learn/progress?level=A1',null,other)).body.subtopics,[]);
 for(const invalid of [{...input,topic_id:'missing'},{...input,subtopic_id:topics[1]+'-1'},{...input,status:'bad'},{}]) assert.equal((await call('/api/me/learn/progress',invalid)).status,400);
 const rls=await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='learner_subtopic_progress'::regclass");assert.equal(rls.rows[0].relrowsecurity,true);
 console.log('PASS Learn API: fresh boot, round-trip, timestamps, sticky/concurrent completion, validation, authentication, user isolation, level filtering, RLS');
} finally {api.kill();await db.query('DELETE FROM users WHERE id=ANY($1)',[[id+'0',id+'1']]);await db.query('DELETE FROM concepts WHERE id=ANY($1)',[topics]);await db.end();}
