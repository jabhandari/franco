import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import type { CurriculumLesson, CurriculumQuestion } from '../types';
import { curriculumAnswer, curriculumReviewDays, curriculumCorrectAnswerText, parseWordBank } from './curriculum.presenter';
const question: CurriculumQuestion = { id:'q', prompt:'Translate', correct_answers:["J'aime le café."], provenance:{kind:'original',source_url:null,source_author:'Franco',license_id:'original',attribution_text:'Franco'}, feedback:{rule:'Keep the accent.',error:'Check the spelling.',remediation:'Reread the example.'} };
assert.equal(curriculumAnswer(question,'  J’aime le café.  ').correct,true);
assert.equal(curriculumAnswer(question,'J’aime le cafe.').correct,true);
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

for (const answer of ["J'AIME LE CAFE", "jAiMeLeCaFe", " j ’ aime  le café !!! ", "J’aime le cafe\u0301."]) assert.equal(curriculumAnswer(question,answer).correct,true,answer);
for (const answer of ["le cafe j'aime", "J'aime le caffe", "!!!", ""]) assert.equal(curriculumAnswer(question,answer).correct,false,answer);
assert.equal(curriculumAnswer(choiceQuestion,'B').correct,false);
assert.equal(curriculumAnswer(choiceQuestion,'b').correct,true);

// All authored free-text and tile answers must tolerate typing conventions,
// and reject changed letters or a reordered sentence.
const directory = new URL('../../content/curriculum/', import.meta.url);
let checked = 0;
for (const filename of readdirSync(directory).filter(name => name.endsWith('.lessons.json'))) {
  const packs: CurriculumLesson[] = JSON.parse(readFileSync(new URL(filename, directory), 'utf8'));
  for (const pack of packs) for (const lesson of Object.values(pack.subtopic_lessons ?? {})) {
    for (const item of [...lesson.guided_production, ...lesson.mastery]) {
      const expected = item.correct_answers[0];
      const relaxed = expected.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/[\p{P}\p{Z}]/gu, '');
      assert.equal(curriculumAnswer(item, ` !! ${relaxed} ! `).correct, true, item.id);
      assert.equal(curriculumAnswer(item, `${expected}z`).correct, false, item.id);
      const tokens = expected.split(/\s+/);
      const reordered = [...tokens].reverse().join(' ');
      if (tokens.length > 1 && reordered !== expected) assert.equal(curriculumAnswer(item, reordered).correct, false, item.id);
      checked++;
    }
  }
}
console.log(`Typing variants, misspellings and word order verified for ${checked} authored answers.`);
