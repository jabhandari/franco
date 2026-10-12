import assert from 'node:assert/strict';
import { completeSkillAggregates, getLearnerProgress, SKILL_AGGREGATES_SQL, CONCEPT_PROGRESS_SQL, RECENT_MISTAKES_SQL } from '../server/learner-progress.js';
import { LEARNING_SKILL_ITEM_TYPES } from '../shared/learning-skills.js';

const rows = [{skill:'lire',level:'B1',exercises_total:'8',exercises_done:'3',exercises_correct:'2'}];
const aggregates = completeSkillAggregates(rows);
assert.equal(aggregates.length,24);
assert.deepEqual(aggregates.find(row => row.skill==='lire' && row.level==='B1'),
  {skill:'lire',level:'B1',exercises_total:8,exercises_done:3,exercises_correct:2,percent:38});
assert.equal(aggregates.find(row => row.skill==='parler' && row.level==='C2').percent,0);
assert.ok(completeSkillAggregates([]).every(row => row.exercises_total===0 && row.exercises_done===0 && row.percent===0));
const itemTypes = Object.values(LEARNING_SKILL_ITEM_TYPES).flat();
assert.equal(new Set(itemTypes).size,itemTypes.length,'inventory taxonomy cannot double-count item types');

// Query orchestration must bind the session user on every read and return
// real rows rather than the legacy hard-coded arrays.
const calls=[];
const progress=[{concept_id:'concept',state:'in_progress',mastery:0.4}];
const mistakes=[{id:'incorrect',correct:false}];
const attempts=[{id:'incorrect'},{id:'correct'}];
const snapshot=await getLearnerProgress(async (sql,params) => {
  calls.push(params);
  if (sql===CONCEPT_PROGRESS_SQL) return progress;
  if (sql===RECENT_MISTAKES_SQL) return mistakes;
  if (sql===SKILL_AGGREGATES_SQL) return rows;
  return attempts;
},'session-user');
assert.deepEqual(calls,[['session-user'],['session-user'],['session-user'],['session-user']]);
assert.deepEqual(snapshot.progress,progress);
assert.deepEqual(snapshot.mistakes,mistakes);
assert.deepEqual(snapshot.attempts,attempts);
assert.deepEqual(snapshot.skill_progress,aggregates);
console.log('learner progress tests passed');
