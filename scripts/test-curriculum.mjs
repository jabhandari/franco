import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateCurriculumTopic, curriculumConcepts } from '../server/curriculum-contract.js';
const topics = JSON.parse(await readFile(new URL('../content/curriculum/topics.json', import.meta.url), 'utf8'));
assert.equal(topics.length,90);
assert.equal(new Set(topics.map(t=>t.topic_id)).size,90);
for (const [i,t] of topics.entries()) {
  assert.deepEqual(validateCurriculumTopic(t),{valid:true,errors:[]});
  assert.equal(t.order_index,i);
  assert.deepEqual(t.prerequisite_concept_ids,i?[topics[i-1].topic_id]:[]);
}
for (const level of ['A1','A2','B1','B2','C1','C2']) assert.equal(topics.filter(t=>t.level===level).length,15);
assert.equal(validateCurriculumTopic({...topics[0],topic_id:'A1-99'}).valid,false);
const rows=[{slug:'A1-01',metadata_json:{}},{slug:'old',metadata_json:{}}];
const result=await curriculumConcepts(async()=>[{topic_id:'A1-01',review_status:'generated',pack_json:{explanation:'private'}}],rows);
assert.equal(result.length,1);assert.equal(result[0].metadata_json.stub,true);assert.equal(result[0].metadata_json.lesson,undefined);
const published=await curriculumConcepts(async()=>[{topic_id:'A1-01',review_status:'published',pack_json:{explanation:'public'}}],rows);
assert.equal(published[0].metadata_json.lesson.explanation,'public');
console.log('Curriculum: 90 topics, ordering, prerequisites, published-only lesson projection passed.');
