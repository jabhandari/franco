import { validateBatch } from '../server/content-contract.js';

const base = { schema_version: 'content.v1', batch_id: 'contract-test-1', idempotency_key: 'contract-test-key-1', source: { id: 'test-source', name: 'Contract tests', url: 'https://example.com/source', license: 'CC0', attribution: 'Franco tests' } };
const item = (type, response = { answer: 'answer' }, evaluation = { mode: 'exact' }, extra = {}) => ({ external_id: `test-${type}`, type, cefr: { level: 'A1', method: 'human_review', confidence: 1 }, prompt: `Test ${type}`, response, evaluation, ...extra });
const items = [
  item('multiple_choice', { choices: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], answer: 'a' }, { mode: 'choice' }),
  item('cloze'), item('free_text', { example: 'Je parle de mon quartier.' }, { mode: 'rubric' }), item('reading'),
  item('word_order', { tokens: ['Je', 'suis'] }, { mode: 'token_order' }),
  item('listening', undefined, undefined, { media: [{ kind: 'audio', url: 'https://example.com/a.mp3' }] }),
  item('speaking', undefined, { mode: 'rubric' }, { media: [{ kind: 'audio', url: 'https://example.com/a.mp3' }] }),
  item('speaking_prompt', { expected: 'Test speaking_prompt' }, { mode: 'external' }),
  item('listen_repeat', { answer: 'Bonjour' }, { mode: 'normalized_text' }, { media: [{ kind: 'audio', url: 'https://example.com/a.mp3' }] }),
  item('vocabulary')
];
const valid = validateBatch({ ...base, items });
if (!valid.valid) throw new Error(`Expected valid contract: ${JSON.stringify(valid.errors)}`);
for (const invalid of [
  { ...base, items: [{ ...items[0], unknown: true }] },
  { ...base, schema_version: 'content.v2', items },
  { ...base, items: [{ ...items[0], cefr: { level: 'D1', method: 'human_review' } }] },
  { ...base, items: [{ ...items[0], response: { choices: [{ id: 'a', text: 'A' }], answer: 'a' } }] }
]) if (validateBatch(invalid).valid) throw new Error('Expected invalid contract to be rejected');
// auto_publish is an allowed opt-in flag (boolean); anything else is rejected.
const trusted = validateBatch({ ...base, auto_publish: true, items });
if (!trusted.valid) throw new Error(`Expected auto_publish:true to validate: ${JSON.stringify(trusted.errors)}`);
if (validateBatch({ ...base, auto_publish: 'yes', items }).valid) throw new Error('Expected non-boolean auto_publish to be rejected');
console.log('content.v1 contract checks passed');
