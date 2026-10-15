import assert from 'node:assert/strict';
import { decodePhones } from '../src/pronunciation/ctc.ts';

const vocab = ['<pad>', 'u', 'ɛ', 'ʁ'];
const ids = [0, 1, 1, 0, 1, 2, 2, 0, 3];
const logits = new Float32Array(ids.flatMap((id) => vocab.map((_, index) => index === id ? 2 : -2)));
assert.deepEqual(decodePhones(logits, ids.length, vocab.length, vocab), ['u', 'u', 'ɛ', 'ʁ']);
assert.throws(() => decodePhones(new Float32Array(2), 2, 4, vocab), /Invalid phoneme logits/);
console.log('pronunciation CTC checks passed');
