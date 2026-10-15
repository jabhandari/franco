import assert from 'node:assert/strict';
import { VERB_CARDS, chooseVerbCard, gradeVerbChoice, publicVerbQuestion, verbCard } from '../server/verb-sprint-deck.js';

assert.equal(VERB_CARDS.length, 54);
assert.equal(new Set(VERB_CARDS.map((card) => card.id)).size, 54);
for (const card of VERB_CARDS) {
  const question = publicVerbQuestion(card, 'test-secret');
  assert.equal(question.choices.length, 4);
  assert.equal(new Set(question.choices.map((choice) => choice.text)).size, 4);
  assert.equal(question.choices.filter((choice) => gradeVerbChoice(card, choice.id, 'test-secret')).length, 1);
  assert.equal(gradeVerbChoice(card, 'invalid', 'test-secret'), null);
  assert.equal(JSON.stringify(question).includes('"answer"'), false);
  assert.equal(verbCard(card.id), card);
}
assert.equal(chooseVerbCard(0, [], () => 0).level, 'A1');
assert.equal(chooseVerbCard(6, [], () => 0).level, 'A2');
assert.equal(chooseVerbCard(12, [], () => 0).level, 'B1');
assert.equal(chooseVerbCard(30, VERB_CARDS.map((card) => card.id)), null);
console.log('verb sprint deck checks passed');
