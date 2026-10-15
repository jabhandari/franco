import assert from 'node:assert/strict';
import { evaluate } from '../server/evaluate.js';
import { levelOrder, originalChoiceId, publicPuzzleQuestion, puzzleReveal, validPuzzleConfig } from '../server/puzzle-rules.js';

for (const lives of [1, 3, 5]) for (const minutes of [3, 5, null]) assert.equal(validPuzzleConfig(lives, minutes), true);
for (const config of [[0, 3], [2, 5], [3, 0], [3, 4], [3, undefined], ['3', 5]]) assert.equal(validPuzzleConfig(...config), false);
assert.equal(levelOrder(0, () => 0.9)[0], 'A1');
assert.equal(levelOrder(4, () => 0.9)[0], 'A2');
assert.equal(levelOrder(8, () => 0.9)[0], 'B1');
assert.equal(levelOrder(24, () => 0.9)[0], 'C2');
assert.equal(levelOrder(4, () => 0.1)[0], 'B1');
assert.equal(new Set(levelOrder(12)).size, 6);

const choice = { id: 'choice-1', item_type: 'multiple_choice', cefr_level: 'A1', prompt: 'Choose the right word',
  response_json: { choices: [{ id: 'a', text: 'Bonjour' }, { id: 'b', text: 'Bonsoir' }], answer: 'a' },
  evaluation_json: { mode: 'choice' } };
const publicChoice = publicPuzzleQuestion(choice, 'test-secret');
assert.equal(publicChoice.kind, 'choice');
assert.equal(publicChoice.choices.length, 2);
assert.equal(JSON.stringify(publicChoice).includes('"answer"'), false, 'correct answer must never leave the API');
assert.equal(publicChoice.choices.some((option) => option.id === 'a' || option.id === 'b'), false, 'source choice keys must be hidden');
assert.equal(originalChoiceId(choice, publicChoice.choices.find((option) => option.text === 'Bonjour').id, 'test-secret'), 'a');
assert.equal(evaluate(choice, 'a'), true);
assert.equal(evaluate(choice, 'b'), false);
assert.equal(puzzleReveal(choice), 'Bonjour');

const order = { id: 'order-1', item_type: 'word_order', cefr_level: 'A2', prompt: 'Build the sentence',
  response_json: { tokens: ['Je', 'suis', 'ici'] }, evaluation_json: { mode: 'token_order' } };
const publicOrder = publicPuzzleQuestion(order, 'test-secret');
assert.equal(publicOrder.kind, 'word_order');
assert.equal(publicOrder.tokens.every((token) => typeof token.id === 'string' && token.id.length === 24), true, 'word order must not expose original indices');
assert.notDeepEqual(publicOrder.tokens.map((token) => token.text), order.response_json.tokens, 'word order must not expose the answer order');
assert.equal(evaluate(order, ['Je', 'suis', 'ici']), true);
assert.equal(evaluate(order, ['Je', 'ici', 'suis']), false);
assert.equal(puzzleReveal(order), 'Je suis ici');
console.log('puzzle rules checks passed');
