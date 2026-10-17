import assert from 'node:assert/strict';
import { curriculumAnswer, curriculumReviewDays } from './curriculum.presenter';
const question = { id:'q', prompt:'Translate', correct_answers:["J'aime le café."], provenance:{kind:'original',source_url:null,source_author:'Franco',license_id:'original',attribution_text:'Franco'}, feedback:{rule:'Keep the accent.',error:'Check the spelling.',remediation:'Reread the example.'} };
assert.equal(curriculumAnswer(question,'  J’aime le café.  ').correct,true);
assert.equal(curriculumAnswer(question,'J’aime le cafe.').correct,false);
assert.match(curriculumAnswer(question,'incorrect').message,/Reread/);
assert.equal(curriculumReviewDays(1,1,{initial_days:1,subsequent_days:[3,7]}),3);
assert.equal(curriculumReviewDays(0,1,{initial_days:1,subsequent_days:[3,7]}),1);
console.log('Curriculum answer feedback and review metadata passed.');
