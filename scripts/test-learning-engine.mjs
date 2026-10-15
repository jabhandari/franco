// Unit checks for the adaptive learning loop: SM-2 scheduling math and the
// server-side answer normalizer/evaluator.
import { sm2Update } from '../server/sm2.js';
import { evaluate, gradeExamQuestion, gradeExerciseItem, normalizeText } from '../server/evaluate.js';
import { cleanExamPrompt, cleanExamPassage } from '../server/exam-text.js';

function assert(cond, message) {
  if (!cond) throw new Error(`FAIL: ${message}`);
  console.log(`ok - ${message}`);
}

// --- SM-2 ---
let r = sm2Update(undefined, true);
assert(r.interval_days === 1 && Math.abs(r.ease - 2.55) < 1e-9, 'first correct answer: interval 1 day, ease 2.55');

r = sm2Update({ interval_days: 1, ease: 2.55 }, true);
assert(Math.abs(r.interval_days - 2.55) < 1e-9, 'second correct answer: interval grows by ease factor');

r = sm2Update({ interval_days: 6, ease: 2.6 }, false);
assert(r.interval_days === 0 && Math.abs(r.ease - 2.4) < 1e-9, 'incorrect answer: interval resets, ease drops by 0.2');

r = sm2Update({ interval_days: 3, ease: 1.35 }, false);
assert(r.ease === 1.3, 'ease never drops below the 1.3 floor');

// --- normalizeText ---
assert(normalizeText('  À sept   HEURES ') === 'à sept heures', 'normalize: trim, lowercase, collapse whitespace');
assert(normalizeText("l\u2019homme") === normalizeText("l'homme"), 'normalize: NFKC folds fancy apostrophes');

// --- evaluate(): choice mode is case-insensitive (matches historic client) ---
const choiceItem = { response_json: { answer: 'b' }, evaluation_json: { mode: 'choice' } };
assert(evaluate(choiceItem, 'B') === true, 'choice: B matches b');
assert(evaluate(choiceItem, ' a ') === false, 'choice: wrong answer rejected');

// --- evaluate(): token_order normalizes before comparing ---
const orderItem = { response_json: { tokens: ['Je', 'suis', 'canadien'] }, evaluation_json: { mode: 'token_order' } };
assert(evaluate(orderItem, ['je', 'suis ', 'CANADIEN']) === true, 'token_order: normalized tokens match');
assert(evaluate(orderItem, ['suis', 'je', 'canadien']) === false, 'token_order: wrong order rejected');
assert(evaluate(orderItem, ['je', 'suis']) === false, 'token_order: missing token rejected');
// Published word-order items store a shuffled bank plus the sentence: the
// shared grading rule resolves the sentence, not the bank order.
const bankOrderItem = { response_json: { tokens: ['canadien', 'suis', 'Je'], expected: 'Je suis canadien' }, evaluation_json: { mode: 'token_order' } };
assert(evaluate(bankOrderItem, ['je', 'suis ', 'CANADIEN']) === true, 'token_order: grades against the stored sentence');
assert(evaluate(bankOrderItem, ['canadien', 'suis', 'je']) === false, 'token_order: shuffled bank order rejected');
assert(evaluate(bankOrderItem, ['je', 'canadien', 'suis']) === false, 'token_order: other wrong orders rejected');

// --- evaluate(): dataset-authored shapes without a contract mode ---
assert(evaluate({ response_json: { answer: 'être' }, evaluation_json: {} }, ' ÊTRE ') === true, 'dataset answer shape graded case-insensitively');
assert(evaluate({ response_json: { expected: 'bonjour' }, evaluation_json: {} }, 'Bonjour') === true, 'dataset expected shape graded');
assert(evaluate({ response_json: {}, evaluation_json: { rubric: { coherence: 'x' } } }, 'Mon texte.') === true, 'rubric items complete on non-empty response');
assert(evaluate({ response_json: {}, evaluation_json: { rubric: { coherence: 'x' } } }, '   ') === false, 'rubric items incomplete on empty response');
assert(evaluate({ response_json: {}, evaluation_json: { expected_points: ['a'] } }, 'ok') === true, 'speaking items complete on non-empty response');

// --- evaluate(): founding-dataset shapes (answer in evaluation_json) ---
const dictationItem = { response_json: {}, evaluation_json: { answer: "lorsque le jour du sabbat fut passé", scoring: 'exact_match_case_insensitive' } };
assert(evaluate(dictationItem, 'Lorsque le jour du sabbat fut passé') === true, 'dictation: scoring label grades like normalized_text');
assert(evaluate(dictationItem, 'lorsque le jour du sabbat fut passé!') === true, 'dictation: trailing punctuation ignored');
assert(evaluate(dictationItem, 'un autre texte') === false, 'dictation: wrong text rejected');
const pronItem = { response_json: {}, evaluation_json: { expected: 'être' } };
assert(evaluate(pronItem, 'être') === true, 'pronunciation: evaluation_json.expected grades');
assert(evaluate(pronItem, '') === false, 'pronunciation: empty self-report rejected');

// --- legacy graders ---
const examRow = { answer: 'À sept heures', choices_json: JSON.stringify({ A: 'À six heures', B: 'À sept heures' }) };
assert(gradeExamQuestion(examRow, 'B') === true, 'exam: choice key resolves to correct text');
assert(gradeExamQuestion(examRow, 'à sept heures') === true, 'exam: free text matches answer');
assert(gradeExamQuestion(examRow, 'A') === false, 'exam: wrong key rejected');

const drillRow = { exercise_type: 'spelling', answer: 'Je parle français.' };
assert(gradeExerciseItem(drillRow, 'je parle français') === true, 'drill: spelling graded case-insensitively');

// --- exam-text cleanup runs at import, not in the UI ---
const cleaned = cleanExamPassage('Sur le livret, vous lisez : Quelle heure est-il ? Cochez la bonne réponse A. midi', 'Sur le livret, vous lisez : Quelle heure est-il ?');
assert(cleaned.prompt === 'Quelle heure est-il ?', 'exam-text: booklet prefix stripped from prompt');
assert(!cleaned.passage.toLowerCase().includes('cochez'), 'exam-text: instruction suffix stripped from passage');

console.log('\nlearning engine checks passed');
