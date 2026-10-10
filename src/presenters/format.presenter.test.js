// Unit checks for the format presenter: text helpers moved verbatim from the
// API client plus small formatting utilities used across views.
import {
  safeText,
  formatEnum,
  getErrorMessage,
  humanize,
  capitalize,
  padNumber,
  choiceLabel,
} from './format.presenter.js';

function assert(cond, message) {
  if (!cond) throw new Error(`FAIL: ${message}`);
  console.log(`ok - ${message}`);
}

// --- safeText (moved verbatim) ---
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

// --- formatEnum (moved verbatim) ---
assert(formatEnum('not_started') === 'Not Started', 'formatEnum: snake_case -> Title Case');
assert(formatEnum('placement') === 'Placement', 'formatEnum: single word capitalized');
assert(formatEnum('') === '', 'formatEnum: empty -> empty');
assert(formatEnum(null) === '', 'formatEnum: null -> empty');
assert(formatEnum(undefined) === '', 'formatEnum: undefined -> empty');
assert(formatEnum('A1') === 'A1', 'formatEnum: already-formatted level unchanged');

// --- getErrorMessage (moved verbatim) ---
assert(getErrorMessage(new Error('boom')) === 'boom', 'getErrorMessage: Error message surfaced');
assert(getErrorMessage({ message: '  spaced  ' }) === 'spaced', 'getErrorMessage: message trimmed');
assert(getErrorMessage(null) === 'Something went wrong. Please try again.', 'getErrorMessage: null -> default');
assert(getErrorMessage(undefined) === 'Something went wrong. Please try again.', 'getErrorMessage: undefined -> default');
assert(getErrorMessage({}) === 'Something went wrong. Please try again.', 'getErrorMessage: no message -> default');
assert(getErrorMessage({ message: '' }) === 'Something went wrong. Please try again.', 'getErrorMessage: blank message -> default');
assert(getErrorMessage('just a string') === 'Something went wrong. Please try again.', 'getErrorMessage: string error -> default');

// --- humanize ---
assert(humanize('writing_prompt') === 'writing prompt', 'humanize: underscores -> spaces');
assert(humanize('speaking') === 'speaking', 'humanize: no underscores unchanged');
assert(humanize(null) === '', 'humanize: null-safe');
assert(humanize(undefined) === '', 'humanize: undefined-safe');
assert(humanize('') === '', 'humanize: empty -> empty');
assert(humanize('a_b_c') === 'a b c', 'humanize: multiple underscores');

// --- capitalize ---
assert(capitalize('reading') === 'Reading', 'capitalize: first letter uppercased');
assert(capitalize('language structures') === 'Language structures', 'capitalize: only first letter changes');
assert(capitalize('Reading') === 'Reading', 'capitalize: already capitalized unchanged');
assert(capitalize('') === '', 'capitalize: empty -> empty');
assert(capitalize(null) === '', 'capitalize: null-safe');
assert(capitalize(undefined) === '', 'capitalize: undefined-safe');

// --- padNumber ---
assert(padNumber(3) === '03', 'padNumber: 3 -> "03"');
assert(padNumber(12) === '12', 'padNumber: 12 -> "12"');
assert(padNumber(1, 3) === '001', 'padNumber: custom width 3');
assert(padNumber(0) === '00', 'padNumber: zero padded');
assert(padNumber(1) === '01', 'padNumber: default width is 2');

// --- choiceLabel ---
assert(choiceLabel({ key: 'A', text: 'Paris' }) === 'A. Paris', 'choiceLabel: "A. Paris"');
assert(choiceLabel({ key: 1, text: 'one' }) === '1. one', 'choiceLabel: numeric key stringified');
assert(
  choiceLabel({ key: 'B', text: '  spaced  ' }) === 'B.   spaced  ',
  'choiceLabel: text not trimmed (matches the old fragment)'
);

console.log('format.presenter checks passed');
