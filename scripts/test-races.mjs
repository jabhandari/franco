import assert from 'node:assert/strict';
import { publicRaceQuestion, raceChoices, raceWinner, resolveRaceChoice, validRaceConfig } from '../server/race-rules.js';
import { evaluate, gradeExamQuestion } from '../server/evaluate.js';
import { originalChoiceId, usesWordBank } from '../server/puzzle-rules.js';

const config = { source: 'past_questions', level: 'A1', question_count: 10, lives: 3, timer_seconds: 300 };
assert.equal(validRaceConfig(config), true);
assert.equal(validRaceConfig({ ...config, lives: null, timer_seconds: null }), true);
assert.equal(validRaceConfig({ ...config, question_count: 0 }), false);
assert.equal(validRaceConfig({ ...config, source: 'arbitrary' }), false);
assert.equal(validRaceConfig({ ...config, timer_seconds: 0 }), false);

const exam = { id: 'exam-1', cefr_section: 'A1', prompt: 'Quelle heure est-il ?', answer: 'B',
  choices_json: { A: 'À six heures', B: 'À sept heures', C: 'À huit heures' } };
const shown = publicRaceQuestion(exam, 'room-secret');
assert.equal(shown.choices.length, 3);
assert.equal(JSON.stringify(shown).includes('"answer"'), false);
assert.equal(shown.choices.some((choice) => choice.id === 'B'), false);
const selected = resolveRaceChoice(exam, shown.choices[1].id, 'room-secret');
assert.equal(selected.text, 'À sept heures');
assert.equal(gradeExamQuestion(exam, selected.id), true);
assert.equal(resolveRaceChoice(exam, shown.choices[1].id, 'different-room'), null);
assert.equal(resolveRaceChoice(exam, 'B', 'room-secret'), null);
assert.equal(resolveRaceChoice(exam, 'À sept heures', 'room-secret'), null);

const canonical = { id: 'content-1', item_type: 'multiple_choice', cefr_level: 'A1', prompt: 'Choose bonjour',
  response_json: { choices: [{ id: 'a', text: 'Bonjour' }, { id: 'b', text: 'Bonsoir' }], answer: 'a' },
  evaluation_json: { mode: 'choice' } };
const canonicalShown = publicRaceQuestion(canonical, 'room-secret', 'content_item');
assert.equal(canonicalShown.choices.length, 2);
assert.equal(JSON.stringify(canonicalShown).includes('"answer"'), false);
assert.equal(originalChoiceId(canonical, canonicalShown.choices[0].id, 'room-secret'), 'a');
assert.equal(evaluate(canonical, originalChoiceId(canonical, canonicalShown.choices[0].id, 'room-secret')), true);
const wordOrder = { id: 'content-2', item_type: 'word_order', cefr_level: 'A1', prompt: 'Put the words in order',
  response_json: { tokens: ['canadien', 'suis', 'Je'], expected: 'Je suis canadien' },
  evaluation_json: { mode: 'token_order' } };
const orderShown = publicRaceQuestion(wordOrder, 'room-secret', 'content_item');
assert.equal(orderShown.kind, 'word_order');
assert.equal(usesWordBank(['Je', 'suis', 'canadien'], wordOrder.response_json.tokens), true);
assert.equal(evaluate(wordOrder, ['Je', 'suis', 'canadien']), true);
assert.equal(evaluate(wordOrder, ['suis', 'Je', 'canadien']), false);
assert.equal(raceChoices({ id: 'legacy', choices_json: ['verb', 'verb'], answer: 'verb' }), null);
assert.equal(raceChoices({ ...exam, answer: 'nonexistent' }), null);

const finished = '2026-10-16T10:00:00Z';
assert.equal(raceWinner([{ seat: 1, correct_count: 8, finished_at: finished },
  { seat: 2, correct_count: 6, finished_at: finished }]), 1);
assert.equal(raceWinner([{ seat: 1, correct_count: 8, finished_at: finished },
  { seat: 2, correct_count: 8, finished_at: finished }]), 'tie');
assert.equal(raceWinner([{ seat: 1, correct_count: 8, finished_at: finished },
  { seat: 2, correct_count: 8, finished_at: '2026-10-16T10:00:01Z' }]), 1);
assert.equal(raceWinner([{ seat: 1, correct_count: 8, finished_at: finished, forfeited_at: finished },
  { seat: 2, correct_count: 6, finished_at: '2026-10-16T10:00:01Z' }]), 2);
assert.equal(raceWinner([{ seat: 1, correct_count: 8, finished_at: null },
  { seat: 2, correct_count: 6, finished_at: finished }]), null);
console.log('race rules checks passed');
