import assert from 'node:assert/strict';
process.env.DATABASE_URL ||= 'postgres://unused:unused@127.0.0.1/unused';
process.env.GROQ_API_KEY = 'test-groq';
const { contentFeedback, feedbackMessages, validateFeedbackInput, validateFeedbackResult, reserveFeedback } = await import('../server/content-feedback.js');

const input = { response: 'Je joue au tennis le samedi.', prompt: 'Parlez de votre loisir.', level: 'B1', targets: ['frequency'] };
assert.match(feedbackMessages(validateFeedbackInput(input))[0].content, /never pronunciation/i);
assert.throws(() => validateFeedbackInput({ ...input, response: '' }), /valid prompt/);
assert.throws(() => validateFeedbackResult({ what_went_well: [{ point: 'Great job', quote: 'invented' }], needs_work: [] }, input.response), /evidence/);
const valid = { what_went_well: [{ point: 'You named the activity.', quote: 'tennis' }], needs_work: [{ point: 'Add why you enjoy it.', quote: 'le samedi' }] };
assert.deepEqual(validateFeedbackResult(valid, input.response), valid);

const calls = [];
const completed = [];
const result = await contentFeedback({ userId: 'me', input,
  reserve: async () => 'one', finish: async (...args) => completed.push(args), log: () => {},
  fetchImpl: async (url, options) => {
    calls.push(url);
    assert.equal(JSON.parse(options.body).response_format.type, 'json_object');
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(valid) } }], usage: { total_tokens: 123 } }) };
  },
});
assert.deepEqual(calls, ['https://api.groq.com/openai/v1/chat/completions']);
assert.equal(result.model, 'qwen/qwen3.8-27b');
assert.equal(completed[0][1][1], 123);

const backupCalls = [];
const backup = await contentFeedback({ userId: 'me', input,
  reserve: async () => 'two', finish: async () => {}, log: () => {},
  fetchImpl: async (url, options) => {
    const model = JSON.parse(options.body).model;
    backupCalls.push(model);
    if (model !== 'openai/gpt-oss-20b') return { ok: false, status: 429 };
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(valid) } }], usage: { total_tokens: 90 } }) };
  },
});
assert.deepEqual(backupCalls, ['qwen/qwen3.8-27b', 'openai/gpt-oss-20b']);
assert.equal(backup.model, 'openai/gpt-oss-20b');

let rolledBack = false;
await assert.rejects(reserveFeedback('me', 1000, { dailyRequests: 1, dailyTokens: 1000 }, async () => ({
  query: async (sql) => {
    if (sql === 'ROLLBACK') rolledBack = true;
    if (sql.startsWith('SELECT estimated_tokens')) return { rows: [{ estimated_tokens: 100, used_tokens: 100, status: 'succeeded' }] };
    return { rows: [] };
  }, release() {},
})), (error) => error.code === 'feedback_daily_limit');
assert.equal(rolledBack, true);
console.log('content feedback checks passed');
