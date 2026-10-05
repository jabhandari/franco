// Unit checks for the FRA-21 presenters: pure render helpers extracted from
// the exercise components, views, and the API client.
import {
  answeredState,
  hasResult,
  feedbackTone,
  feedbackTitle,
  elapsedMs,
} from '../src/presenters/attempt.js';
import { CEFR_LEVELS } from '../src/presenters/levels.js';
import {
  safeText,
  formatEnum,
  getErrorMessage,
  humanize,
  capitalize,
  padNumber,
  choiceLabel,
} from '../src/presenters/format.js';
import { shuffle, normalizeChoices } from '../src/presenters/collections.js';
import { sanitizeEntry } from '../src/presenters/entry.js';
import { POS_LABELS, describeWord } from '../src/presenters/words.js';
import { readFileSync } from 'node:fs';

function assert(cond, message) {
  if (!cond) throw new Error(`FAIL: ${message}`);
  console.log(`ok - ${message}`);
}

// --- attempt.js ---
assert(answeredState({ correct: true }) === 'correct', 'answeredState: correct result -> "correct"');
assert(answeredState({ correct: false }) === 'wrong', 'answeredState: wrong result -> "wrong"');
assert(answeredState(null) === null, 'answeredState: null -> null');
assert(answeredState(undefined) === null, 'answeredState: undefined -> null');
assert(answeredState({ error: 'boom' }) === null, 'answeredState: error result -> null');
assert(answeredState({}) === 'wrong', 'answeredState: result without correct flag -> "wrong"');
assert(answeredState({ correct: true, error: 'late' }) === null, 'answeredState: error wins over correct');

assert(hasResult({ correct: true }) === true, 'hasResult: real result -> true');
assert(hasResult({ correct: false }) === true, 'hasResult: wrong result still counts -> true');
assert(hasResult({ error: 'boom' }) === false, 'hasResult: error -> false');
assert(hasResult(null) === false, 'hasResult: null -> false');
assert(hasResult(undefined) === false, 'hasResult: undefined -> false');

assert(feedbackTone({ correct: true }) === 'correct', 'feedbackTone: correct -> "correct"');
assert(feedbackTone({ correct: false }) === 'incorrect', 'feedbackTone: wrong -> "incorrect"');
assert(feedbackTone(null) === 'incorrect', 'feedbackTone: null -> "incorrect"');
assert(feedbackTone({ error: 'x' }) === 'incorrect', 'feedbackTone: error -> "incorrect"');

assert(feedbackTitle({ correct: true }) === 'Correct!', 'feedbackTitle: correct -> "Correct!"');
assert(feedbackTitle({ correct: false }) === 'Not quite.', 'feedbackTitle: wrong -> "Not quite."');
assert(feedbackTitle(null) === 'Not quite.', 'feedbackTitle: null -> "Not quite."');

{
  const started = Date.now();
  const elapsed = elapsedMs(started);
  assert(typeof elapsed === 'number' && elapsed >= 0 && elapsed < 5000, 'elapsedMs: returns ~now minus startedAt');
}

// --- levels.js ---
assert(
  Array.isArray(CEFR_LEVELS) && CEFR_LEVELS.join(',') === 'A1,A2,B1,B2,C1,C2',
  'CEFR_LEVELS: A1..C2 in order'
);
{
  const conceptsSrc = readFileSync(new URL('../src/components/concepts.jsx', import.meta.url), 'utf8');
  assert(
    /from '\.\.\/presenters\/levels\.js'/.test(conceptsSrc) && /export const LEVELS = CEFR_LEVELS;/.test(conceptsSrc),
    'concepts LEVELS export still aliases CEFR_LEVELS'
  );
}

// --- format.js: safeText (moved verbatim) ---
assert(safeText('hello') === 'hello', 'safeText: string passes through');
assert(safeText(42) === '42', 'safeText: finite number -> string');
assert(safeText(0) === '0', 'safeText: zero is a valid number');
assert(safeText(NaN) === '', 'safeText: NaN -> fallback');
assert(safeText(Infinity) === '', 'safeText: Infinity -> fallback');
assert(safeText({}) === '', 'safeText: object -> fallback');
assert(safeText([1]) === '', 'safeText: array -> fallback');
assert(safeText(true) === '', 'safeText: boolean -> fallback');
assert(safeText(null) === '', 'safeText: null -> fallback');
assert(safeText(undefined) === '', 'safeText: undefined -> fallback');
assert(safeText(null, 'n/a') === 'n/a', 'safeText: custom fallback used');

// --- format.js: formatEnum (moved verbatim) ---
assert(formatEnum('not_started') === 'Not Started', 'formatEnum: snake_case -> Title Case');
assert(formatEnum('placement') === 'Placement', 'formatEnum: single word capitalized');
assert(formatEnum('') === '', 'formatEnum: empty -> empty');
assert(formatEnum(null) === '', 'formatEnum: null -> empty');
assert(formatEnum(undefined) === '', 'formatEnum: undefined -> empty');
assert(formatEnum('A1') === 'A1', 'formatEnum: already-formatted level unchanged');

// --- format.js: getErrorMessage (moved verbatim) ---
assert(getErrorMessage(new Error('boom')) === 'boom', 'getErrorMessage: Error message surfaced');
assert(getErrorMessage({ message: '  spaced  ' }) === 'spaced', 'getErrorMessage: message trimmed');
assert(getErrorMessage(null) === 'Something went wrong. Please try again.', 'getErrorMessage: null -> default');
assert(getErrorMessage(undefined) === 'Something went wrong. Please try again.', 'getErrorMessage: undefined -> default');
assert(getErrorMessage({}) === 'Something went wrong. Please try again.', 'getErrorMessage: no message -> default');
assert(getErrorMessage({ message: '' }) === 'Something went wrong. Please try again.', 'getErrorMessage: blank message -> default');
assert(getErrorMessage('just a string') === 'Something went wrong. Please try again.', 'getErrorMessage: string error -> default');

// --- format.js: humanize ---
assert(humanize('writing_prompt') === 'writing prompt', 'humanize: underscores -> spaces');
assert(humanize('speaking') === 'speaking', 'humanize: no underscores unchanged');
assert(humanize(null) === '', 'humanize: null-safe');
assert(humanize(undefined) === '', 'humanize: undefined-safe');
assert(humanize('') === '', 'humanize: empty -> empty');
assert(humanize('a_b_c') === 'a b c', 'humanize: multiple underscores');

// --- format.js: capitalize ---
assert(capitalize('reading') === 'Reading', 'capitalize: first letter uppercased');
assert(capitalize('language structures') === 'Language structures', 'capitalize: only first letter changes');
assert(capitalize('Reading') === 'Reading', 'capitalize: already capitalized unchanged');
assert(capitalize('') === '', 'capitalize: empty -> empty');
assert(capitalize(null) === '', 'capitalize: null-safe');
assert(capitalize(undefined) === '', 'capitalize: undefined-safe');

// --- format.js: padNumber ---
assert(padNumber(3) === '03', 'padNumber: 3 -> "03"');
assert(padNumber(12) === '12', 'padNumber: 12 -> "12"');
assert(padNumber(1, 3) === '001', 'padNumber: custom width 3');
assert(padNumber(0) === '00', 'padNumber: zero padded');
assert(padNumber(1) === '01', 'padNumber: default width is 2');

// --- format.js: choiceLabel ---
assert(choiceLabel({ key: 'A', text: 'Paris' }) === 'A. Paris', 'choiceLabel: "A. Paris"');
assert(choiceLabel({ key: 1, text: 'one' }) === '1. one', 'choiceLabel: numeric key stringified');
assert(
  choiceLabel({ key: 'B', text: '  spaced  ' }) === 'B.   spaced  ',
  'choiceLabel: text not trimmed (matches the old fragment)'
);

// --- collections.js: shuffle (moved verbatim) ---
{
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const out = shuffle(input);
  assert(out !== input, 'shuffle: returns a new array');
  assert(out.length === input.length && [...out].sort().join(',') === '1,2,3,4,5,6,7,8', 'shuffle: same elements, none lost');
  assert(input.join(',') === '1,2,3,4,5,6,7,8', 'shuffle: input not mutated');
  assert(shuffle([]).join(',') === '', 'shuffle: empty array');
  const seen = new Set();
  for (let i = 0; i < 20; i += 1) seen.add(shuffle(['a', 'b', 'c']).join(','));
  assert(seen.size > 1, 'shuffle: actually randomizes order');
}

// --- collections.js: normalizeChoices (moved verbatim) ---
assert(
  JSON.stringify(normalizeChoices([{ key: 'A', text: 'Paris' }])) === JSON.stringify([{ key: 'A', text: 'Paris' }]),
  'normalizeChoices: [{key,text}] passes through'
);
assert(
  normalizeChoices([{ id: 'b', text: 'London' }])[0].key === 'b',
  'normalizeChoices: {id} falls back to key'
);
assert(
  normalizeChoices('[{"key":"A","text":"x"}]')[0].text === 'x',
  'normalizeChoices: JSON string parsed'
);
assert(normalizeChoices('not json').length === 0, 'normalizeChoices: bad JSON string -> []');
assert(
  JSON.stringify(normalizeChoices({ A: 'Paris', B: 'Lyon' })) === JSON.stringify([{ key: 'A', text: 'Paris' }, { key: 'B', text: 'Lyon' }]),
  'normalizeChoices: {A: "..."} map -> entries'
);
assert(normalizeChoices(null).length === 0, 'normalizeChoices: null -> []');
assert(normalizeChoices(undefined).length === 0, 'normalizeChoices: undefined -> []');
assert(normalizeChoices(5).length === 0, 'normalizeChoices: non-object -> []');
assert(
  normalizeChoices([{ key: 'A', text: '' }, { key: 'B', text: 'ok' }]).length === 1,
  'normalizeChoices: blank-text choices filtered out'
);
assert(
  normalizeChoices([{ key: { odd: 1 }, text: 'x' }])[0].key === '',
  'normalizeChoices: object-shaped key collapses to empty string'
);

// --- entry.js: sanitizeEntry (moved verbatim, behavior parity) ---
assert(JSON.stringify(sanitizeEntry(null)) === '{}', 'sanitizeEntry: null -> {}');
assert(JSON.stringify(sanitizeEntry([])) === '{}', 'sanitizeEntry: array -> {}');
assert(JSON.stringify(sanitizeEntry('x')) === '{}', 'sanitizeEntry: string -> {}');
assert(
  sanitizeEntry({ prompt: { nested: 1 }, level: 2, item_kind: 'content_item' }).prompt === '',
  'sanitizeEntry: object-shaped text field collapses to ""'
);
assert(
  sanitizeEntry({ prompt: 42 }).prompt === '42',
  'sanitizeEntry: numeric text field stringified'
);
assert(
  sanitizeEntry({ item_kind: 'content_item', id: 7 }).id === 7,
  'sanitizeEntry: non-text fields preserved untouched'
);
assert(
  sanitizeEntry({ tokens: ['Je', { x: 1 }, '', 'suis'] }).tokens.join(',') === 'Je,suis',
  'sanitizeEntry: object-shaped and empty list items dropped'
);
assert(
  sanitizeEntry({ tokens: 'not a list' }).tokens.length === 0,
  'sanitizeEntry: non-array list field -> []'
);
assert(
  sanitizeEntry({ choices: [{ key: 'A', text: 'x' }] }).choices[0].key === 'A',
  'sanitizeEntry: choices normalized via normalizeChoices'
);
assert(
  sanitizeEntry({ rubric: { spelling: { strict: 1 }, clarity: 'ok' } }).rubric.spelling === '',
  'sanitizeEntry: object-shaped rubric value collapses'
);
assert(
  JSON.stringify(sanitizeEntry({ rubric: 'flat' }).rubric) === '{}',
  'sanitizeEntry: non-object rubric -> {}'
);
assert(
  sanitizeEntry({ media: [{ kind: 'audio', url: 123 }, 'nope', null] }).media.length === 1 &&
    sanitizeEntry({ media: [{ kind: 'audio', url: 123 }] }).media[0].kind === 'audio',
  'sanitizeEntry: media keeps objects, safeTexts url, keeps other fields'
);

// --- words.js: describeWord (moved verbatim) ---
assert(
  describeWord('{"lemma":"accord","pos":"NOM","gender":"m","freq_rank":145}') === 'noun · masculine · common (#145)',
  'describeWord: full Lexique row -> readable description'
);
assert(
  describeWord('{"lemma":"aller","pos":"VER","gender":"f","number":"s","freq_rank":45}') === 'verb · feminine · singular · very common (#45)',
  'describeWord: feminine singular very-common verb'
);
assert(
  describeWord('{"lemma":"xyz","pos":"NOM","freq_rank":5000}') === 'noun · less common (#5000)',
  'describeWord: less-common bucket without gender'
);
assert(
  describeWord('{"lemma":"xyz","pos":"NOM:sub"}') === 'noun',
  'describeWord: pos subtype split on colon'
);
assert(
  describeWord('{"lemma":"xyz","pos":"XYZ"}') === 'xyz',
  'describeWord: unknown pos code lowercased'
);
assert(
  describeWord('le / la / l’ / les') === 'le / la / l’ / les',
  'describeWord: plain-text topic unchanged'
);
assert(
  describeWord('not json') === 'not json',
  'describeWord: invalid JSON unchanged'
);
assert(
  describeWord('["a","b"]') === '["a","b"]',
  'describeWord: JSON array (no pos) unchanged'
);
assert(
  describeWord('{"lemma":"x"}') === '{"lemma":"x"}',
  'describeWord: JSON object without pos unchanged'
);
assert(describeWord(42) === '42', 'describeWord: non-string -> safeText');
assert(describeWord(null) === '', 'describeWord: null -> ""');
assert(
  describeWord('{"lemma":"xyz","pos":"NOM","freq_rank":0}') === 'noun',
  'describeWord: zero rank omitted'
);
assert(
  describeWord('{"lemma":"xyz","pos":"NOM","number":"p"}') === 'noun · plural',
  'describeWord: plural marker'
);

assert(POS_LABELS.NOM === 'noun', 'POS_LABELS: NOM -> noun');
assert(POS_LABELS.VER === 'verb', 'POS_LABELS: VER -> verb');
assert(POS_LABELS.AUX === 'auxiliary verb', 'POS_LABELS: AUX -> auxiliary verb');
assert(Object.keys(POS_LABELS).length === 13, 'POS_LABELS: all 13 codes moved');

console.log('presenter checks passed');
