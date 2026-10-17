import assert from 'node:assert/strict';
import {storyPath,createStoryService} from '../server/stories.js';
import {loadStories} from '../server/story-content.js';
const catalog=await loadStories();
assert.equal(catalog.length,50);
assert.ok(storyPath(catalog,[]).every(s=>s.state==='current'));
assert.deepEqual(storyPath([...catalog].reverse(),[]).map(s=>s.id),catalog.map(s=>s.id));
// In-memory SQL adapter exercises service transactions without a live database.
const rows=new Map();let commits=0,rollbacks=0;
const client={
 async query(sql,args=[]) {
  if(sql==='BEGIN') return {rows:[]};
  if(sql==='COMMIT') {commits++;return {rows:[]};}
  if(sql==='ROLLBACK') {rollbacks++;return {rows:[]};}
  if(sql.startsWith('SELECT id FROM users')) return {rows:args[0]==='missing'?[]:[{id:args[0]}]};
  if(sql.startsWith('SELECT story_id')) return {rows:[...rows.values()].filter(row=>row.user_id===args[0])};
  if(sql.startsWith('INSERT INTO learner_story_progress')) {
   const [user_id,story_id,version,state,answered_question_ids]=args;
   rows.set(`${user_id}:${story_id}`,{user_id,story_id,version,state,answered_question_ids});return {rows:[]};
  }
  throw new Error(`Unexpected query: ${sql}`);
 },release(){}
};
const pool={query:client.query,connect:async()=>client},service=createStoryService(pool,async()=>catalog);
const last=catalog.at(-1),first=catalog[0];
const detail=await service.detail('fresh',last.id);assert.equal(detail.status,200);
assert.equal(detail.body.story.text,last.text);
assert.equal(JSON.stringify(detail.body).includes('correct_option_id'),false);
assert.equal(JSON.stringify(detail.body).includes('explanation'),false);
const sourceOptions=JSON.stringify(last.questions.map(q=>q.options));
const permutations=new Set();
for(let n=0;n<20;n++) {
 const served=(await service.detail('fresh',last.id)).body.story;
 permutations.add(JSON.stringify(served.questions.map(q=>q.options)));
 for(const [i,q] of served.questions.entries()) assert.deepEqual([...q.options].sort((a,b)=>a.id.localeCompare(b.id)),[...last.questions[i].options].sort((a,b)=>a.id.localeCompare(b.id)));
}
assert.ok(permutations.size>1);assert.equal(JSON.stringify(last.questions.map(q=>q.options)),sourceOptions);
const answer=(user,story,q,option=q.correct_option_id)=>service.act(user,story.id,'answer',{version:story.version,question_id:q.id,option_id:option});
const q=last.questions[0],wrong=q.options.find(o=>o.id!==q.correct_option_id).id;
for(let n=0;n<8;n++) {const r=await answer('fresh',last,q,wrong);assert.equal(r.status,200);assert.equal(r.body.correct,false);assert.deepEqual(r.body.answered_question_ids,[]);}
for(const question of last.questions) assert.equal((await answer('fresh',last,question)).status,200);
assert.equal((await answer('fresh',last,q)).body.answered_question_ids.length,6);
let path=(await service.list('fresh')).body.stories;
assert.equal(path[49].state,'completed');assert.equal(path[0].state,'current');
assert.ok((await service.list('other')).body.stories.every(s=>s.state==='current' && s.answered===0));
for(const question of first.questions) await answer('fresh',first,question);
path=(await service.list('fresh')).body.stories;assert.equal(path.filter(s=>s.state==='completed').length,2);
rows.set('fresh:story-25',{user_id:'fresh',story_id:'story-25',version:catalog[24].version,state:'skipped',answered_question_ids:[]});
assert.equal((await service.detail('fresh','story-25')).status,200);
for(const question of catalog[24].questions) await answer('fresh',catalog[24],question);
assert.equal((await service.detail('fresh','story-25')).body.state,'completed');
assert.equal((await service.detail('fresh','absent')).status,404);
assert.equal((await service.act('fresh',last.id,'answer',{})).status,400);
assert.equal((await service.act('fresh',last.id,'skip',{version:last.version})).status,400);
assert.equal((await service.act('fresh',last.id,'answer',{version:last.version+1})).status,409);
assert.equal((await service.act('fresh',last.id,'answer',{version:last.version,question_id:'absent',option_id:'a'})).status,400);
assert.equal((await answer('missing',last,q)).status,401);
assert.ok(commits>0 && rollbacks>0);
console.log('Stories: story 50 first, out-of-order completion, retries, idempotence, saved legacy progress, user isolation, private keys, shuffled options and input guards passed.');
