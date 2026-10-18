import assert from 'node:assert/strict';
import { abandonedRacePlayer, publicRaceQuestion, raceChoices, raceWinner, resolveRaceChoice, validRaceConfig } from '../server/race-rules.js';
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
  { seat: 2, correct_count: 6, finished_at: '2026-10-16T10:00:01Z' }]), 1);
assert.equal(raceWinner([{ seat: 1, correct_count: 1, finished_at: finished, forfeited_at: finished, lives_left: 1 },
  { seat: 2, correct_count: 0, finished_at: finished, lives_left: 0 }]), 1);
assert.equal(raceWinner([{ seat: 1, correct_count: 0, finished_at: finished, lives_left: 0 },
  { seat: 2, correct_count: 1, finished_at: finished, forfeited_at: finished, lives_left: 1 }]), 2);
assert.equal(raceWinner([{ seat: 1, correct_count: 1, finished_at: finished, forfeited_at: finished },
  { seat: 2, correct_count: 1, finished_at: '2026-10-16T10:00:01Z' }]), 2);
assert.equal(raceWinner([{ seat: 1, correct_count: 0, final_score: 1, finished_at: finished },
  { seat: 2, correct_count: 2, final_score: 0, finished_at: finished }]), 1);
assert.equal(raceWinner([{ seat: 1, correct_count: 8, finished_at: null },
  { seat: 2, correct_count: 6, finished_at: finished }]), null);
assert.equal(abandonedRacePlayer([{ finished_at: finished, last_seen_at: finished },
  { finished_at: null, last_seen_at: '2026-10-16T10:01:00Z' }], Date.parse('2026-10-16T10:12:00Z'))?.last_seen_at, '2026-10-16T10:01:00Z');
assert.equal(abandonedRacePlayer([{ finished_at: finished, last_seen_at: finished },
  { finished_at: null, last_seen_at: '2026-10-16T10:08:00Z' }], Date.parse('2026-10-16T10:12:00Z')), null);
assert.equal(abandonedRacePlayer([{ finished_at: '2026-10-16T10:09:00Z', last_seen_at: finished },
  { finished_at: null, last_seen_at: finished }], Date.parse('2026-10-16T10:12:00Z')), null);
assert.equal(abandonedRacePlayer([{ finished_at: null, last_seen_at: finished },
  { finished_at: null, last_seen_at: finished }], Date.parse('2026-10-16T10:12:00Z')), null);
console.log('race rules checks passed');

// Real transaction boundary behavior: rollback before retry, no duplicate commit,
// release every client, and never retry validation or unrelated database errors.
const { raceTransaction } = await import('../server/race-transaction.js');
const events = [];
const fakePool = { connect: async () => ({ query: async (sql) => events.push(sql), release: () => events.push('release') }) };
let calls = 0;
assert.equal(await raceTransaction(fakePool, async () => {
  calls += 1;
  if (calls === 1) throw Object.assign(new Error('deadlock detected'), { code: '40P01' });
  return 'joined';
}), 'joined');
assert.deepEqual(events, ['BEGIN', 'ROLLBACK', 'release', 'BEGIN', 'COMMIT', 'release']);
assert.equal(calls, 2);
calls = 0;
await assert.rejects(raceTransaction(fakePool, async () => { calls += 1; throw new Error('room full'); }), /room full/);
assert.equal(calls, 1);
calls = 0;
await assert.rejects(raceTransaction(fakePool, async () => {
  calls += 1; throw Object.assign(new Error('deadlock detected'), { code: '40P01' });
}), /race is busy/);
assert.equal(calls, 3);
