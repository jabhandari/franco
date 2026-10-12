// Unit checks for the collections presenter: shuffle and choice
// normalization, moved verbatim from the exercise components.
import { shuffle, normalizeChoices } from './collections.presenter.ts';

function assert(cond, message) {
  if (!cond) throw new Error(`FAIL: ${message}`);
  console.log(`ok - ${message}`);
}

// --- shuffle (moved verbatim) ---
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

// --- normalizeChoices (moved verbatim) ---
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

console.log('collections.presenter checks passed');
