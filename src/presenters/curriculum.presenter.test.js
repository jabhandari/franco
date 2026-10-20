import assert from 'node:assert/strict';
import { curriculumAnswer, curriculumReviewDays, curriculumCorrectAnswerText, parseWordBank } from './curriculum.presenter';
const question = { id:'q', prompt:'Translate', correct_answers:["J'aime le café."], provenance:{kind:'original',source_url:null,source_author:'Franco',license_id:'original',attribution_text:'Franco'}, feedback:{rule:'Keep the accent.',error:'Check the spelling.',remediation:'Reread the example.'} };
assert.equal(curriculumAnswer(question,'  J’aime le café.  ').correct,true);
assert.equal(curriculumAnswer(question,'J’aime le cafe.').correct,false);
assert.match(curriculumAnswer(question,'incorrect').message,/Reread/);
assert.equal(curriculumReviewDays(1,1,{initial_days:1,subsequent_days:[3,7]}),3);
assert.equal(curriculumReviewDays(0,1,{initial_days:1,subsequent_days:[3,7]}),1);
// Correct-answer display text: free text renders as authored; choice ids
// resolve to their labels.
assert.equal(curriculumCorrectAnswerText(question),"J'aime le café.");
const choiceQuestion = { ...question, choices:[{id:'a',text:'Bonjour'},{id:'b',text:'Merci'}], correct_answers:['b'] };
assert.equal(curriculumCorrectAnswerText(choiceQuestion),'Merci');
// Word bank parsing: marker splits prompt from tokens, order preserved,
// punctuation stays attached to its token.
const bank = parseWordBank("Reconstruct this new French message from the word bank, keeping accents and punctuation: Good evening, my name is Sami. Word bank: Sami. / m'appelle / je / Bonsoir,");
assert.deepEqual(bank?.tokens,['Sami.',"m'appelle",'je','Bonsoir,']);
assert.equal(bank?.prompt,'Reconstruct this new French message from the word bank, keeping accents and punctuation: Good evening, my name is Sami.');
assert.equal(parseWordBank('Translate this sentence.'),null);
assert.equal(parseWordBank('Build it. Word bank: '),null);
console.log('Curriculum answer feedback and review metadata passed.');
