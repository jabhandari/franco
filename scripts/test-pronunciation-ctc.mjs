import assert from 'node:assert/strict';
import { decodePhones } from '../src/pronunciation/ctc.ts';
import { comparePhones, findTargetWord, TARGET_WORDS } from '../src/pronunciation/compare.ts';
import { hasClearSpeech } from '../src/pronunciation/signal.ts';

const vocab = ['<pad>', 'u', 'ɛ', 'ʁ'];
const ids = [0, 1, 1, 0, 1, 2, 2, 0, 3];
const logits = new Float32Array(ids.flatMap((id) => vocab.map((_, index) => index === id ? 2 : -2)));
assert.deepEqual(decodePhones(logits, ids.length, vocab.length, vocab), ['u', 'u', 'ɛ', 'ʁ']);
assert.throws(() => decodePhones(new Float32Array(2), 2, 4, vocab), /Invalid phoneme logits/);
const target = TARGET_WORDS.find((word) => word.id === 'rentrer');
assert.ok(target);
assert.deepEqual(target.phones, ['ʁ', 'ɑ̃', 't', 'ʁ', 'e']);
assert.deepEqual(comparePhones(target.phones, target.phones), {
  similarity: 100, matched: 5, expectedCount: 5, extra: [],
  sounds: target.phones.map((phone) => ({ expected: phone, heard: phone, status: 'matched' })),
});
const missing = comparePhones(target.phones, ['ʁ', 'ɑ̃', 'ʁ', 'e']);
assert.equal(missing.similarity, 80);
assert.deepEqual(missing.sounds[2], { expected: 't', heard: null, status: 'missing' });
const unrelated = comparePhones(target.phones, ['h', 'ɛ', 'l', 'o', 'h', 'ɛ', 'l', 'o']);
assert.ok(unrelated.similarity < 25);
assert.equal(comparePhones(target.phones, []).similarity, 0);
assert.equal(findTargetWord('Rentrer!')?.id, 'rentrer');
assert.equal(findTargetWord('a longer phrase'), null);
const steadyNoise = new Float32Array(16_000).map((_, index) => Math.sin(index * .1) * .025);
assert.equal(hasClearSpeech(steadyNoise), false);
const speechBurst = new Float32Array(16_000).map((_, index) => index > 4_000 && index < 12_000 ? Math.sin(index * .1) * .12 : Math.sin(index * .1) * .004);
assert.equal(hasClearSpeech(speechBurst), true);
console.log('pronunciation CTC checks passed');
