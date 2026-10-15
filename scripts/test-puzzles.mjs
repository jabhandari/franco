import assert from 'node:assert/strict';
import { evaluate } from '../server/evaluate.js';
import { levelOrder, originalChoiceId, publicPuzzleQuestion, puzzleReveal, usesWordBank, validPuzzleConfig } from '../server/puzzle-rules.js';

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

// Published word-order items store a shuffled word bank in response_json.tokens
// alongside the correct sentence (answer/expected): the puzzle and Practice
// must both resolve the sentence, never join the bank.
const order = { id: 'order-1', item_type: 'word_order', cefr_level: 'A2', prompt: 'Build the sentence',
  response_json: { tokens: ['suis', 'ici', 'Je'], expected: 'Je suis ici' }, evaluation_json: { mode: 'token_order' } };
const publicOrder = publicPuzzleQuestion(order, 'test-secret');
assert.equal(publicOrder.kind, 'word_order');
assert.equal(publicOrder.tokens.every((token) => typeof token.id === 'string' && token.id.length === 24), true, 'word order must not expose original indices');
assert.deepEqual(publicOrder.tokens.map((token) => token.text).sort(), ['Je', 'ici', 'suis'].sort(), 'word order bank must carry every word of the sentence');
assert.notEqual(publicOrder.tokens.map((token) => token.text).join(' '), puzzleReveal(order), 'word order bank must not expose the answer order');
assert.equal(evaluate(order, ['Je', 'suis', 'ici']), true, 'token_order grades against the stored sentence');
assert.equal(evaluate(order, ['suis', 'ici', 'Je']), false, 'token_order rejects the shuffled bank order');
assert.equal(evaluate(order, ['Je', 'ici', 'suis']), false, 'token_order rejects other wrong orders');
assert.equal(puzzleReveal(order), 'Je suis ici', 'puzzle reveal must show the stored sentence, not the joined bank');
assert.equal(usesWordBank(['Je', 'suis', 'ici'], order.response_json.tokens), true);
assert.equal(usesWordBank(['Je', 'suis', 'demain'], order.response_json.tokens), false);
const importedOrder = { ...order, context: "L'église Notre-Dame possède un mobilier remarquable.",
  response_json: { tokens: ['église', "L'", 'mobilier', 'Notre-Dame', 'possède', 'remarquable', 'un'],
    expected: "L'église Notre-Dame possède un mobilier remarquable." } };
assert.equal(publicPuzzleQuestion(importedOrder, 'test-secret').context, null, 'source sentence must not leak the answer');
assert.equal(evaluate(importedOrder, ["L'", 'église', 'Notre-Dame', 'possède', 'un', 'mobilier', 'remarquable']), true);
// Legacy shape without a stored sentence still grades against the ordered bank.
const legacyOrder = { id: 'order-2', item_type: 'word_order', cefr_level: 'A2', prompt: 'Build the sentence',
  response_json: { tokens: ['Je', 'suis', 'ici'] }, evaluation_json: { mode: 'token_order' } };
assert.equal(evaluate(legacyOrder, ['Je', 'suis', 'ici']), true, 'token_order without a stored sentence falls back to the token order');
assert.equal(puzzleReveal(legacyOrder), 'Je suis ici');
console.log('puzzle rules checks passed');
