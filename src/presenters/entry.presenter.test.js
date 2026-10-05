// Unit checks for the entry presenter: sanitizeEntry, moved verbatim from
// ExerciseCard (behavior parity with the old inline version).
import { sanitizeEntry } from './entry.presenter.js';

function assert(cond, message) {
  if (!cond) throw new Error(`FAIL: ${message}`);
  console.log(`ok - ${message}`);
}

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

console.log('entry.presenter checks passed');
