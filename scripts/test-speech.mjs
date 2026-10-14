import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

process.env.DATABASE_URL ||= 'postgres://unused:unused@127.0.0.1/unused';
process.env.GROQ_API_KEY = 'test-key';
const { speechFeedback } = await import('../server/evaluate.js');
const { pronunciationFeedback } = await import('../shared/pronunciation-feedback.js');
const {
  SpeechError, audioMime, readAudio, audioDuration, admitSpeech,
  speechConfig, transcribeSpeech, transcriptHash, validateSpeakingCompletion,
} = await import('../server/speech.js');

function rejectsCode(promise, code) {
  return assert.rejects(promise, (error) => error instanceof SpeechError && error.code === code);
}

const match = speechFeedback('Je parle français.', 'je parle français');
assert.equal(match.mode, 'word_diff');
assert.deepEqual(match.expected.map((token) => token.status), ['matched', 'matched', 'matched']);
assert.equal(speechFeedback(null, 'bonjour').mode, 'transcript_only');
assert.deepEqual(speechFeedback('Je parle français', 'Je français').expected.map((token) => token.status), ['matched', 'missed', 'matched']);
assert.deepEqual(speechFeedback('Je parle', 'Je parle bien').heard.map((token) => token.status), ['matched', 'matched', 'extra']);
assert.deepEqual(speechFeedback('je je parle', 'je parle').expected.map((token) => token.status), ['matched', 'missed', 'matched']);
assert.deepEqual(speechFeedback("L’homme arrive", "l'homme arrive!").expected.map((token) => token.status), ['matched', 'matched']);

assert.equal(audioMime('audio/webm;codecs=opus').extension, 'webm');
assert.equal(audioMime('audio/mp4').extension, 'm4a');
assert.throws(() => audioMime('audio/wav'), (error) => error.code === 'speech_unsupported_format');
assert.deepEqual(await readAudio(Object.assign(Readable.from([Buffer.from('ok')]), { headers: {} }), 8), Buffer.from('ok'));
await rejectsCode(readAudio(Object.assign(Readable.from([]), { headers: {} }), 8), 'speech_empty_audio');
await rejectsCode(readAudio(Object.assign(Readable.from([Buffer.alloc(9)]), { headers: {} }), 8), 'speech_too_large');
const webmElement = (id, payload) => Buffer.concat([Buffer.from(id, 'hex'), Buffer.from([0x80 | payload.length]), payload]);
const webmAt = (milliseconds) => {
  const header = webmElement('1a45dfa3', webmElement('4282', Buffer.from('webm')));
  const info = webmElement('1549a966', webmElement('2ad7b1', Buffer.from([0x0f, 0x42, 0x40])));
  const frequency = Buffer.alloc(8); frequency.writeDoubleBE(48000);
  const audio = webmElement('e1', Buffer.concat([webmElement('b5', frequency), webmElement('9f', Buffer.from([1]))]));
  const track = webmElement('ae', Buffer.concat([webmElement('d7', Buffer.from([1])), webmElement('83', Buffer.from([2])), webmElement('86', Buffer.from('A_OPUS')), audio]));
  const tracks = webmElement('1654ae6b', track);
  const stamp = Buffer.alloc(4); stamp.writeUInt32BE(milliseconds);
  const cluster = webmElement('1f43b675', Buffer.concat([webmElement('e7', stamp), webmElement('a3', Buffer.from([0x81, 0, 0, 0x80]))]));
  return Buffer.concat([header, webmElement('18538067', Buffer.concat([info, tracks, cluster]))]);
};
const browserWebm = webmAt(59000);
assert.ok((await audioDuration(browserWebm, 'audio/webm', 60)) > 59);
await rejectsCode(audioDuration(webmAt(60001), 'audio/webm', 60), 'speech_too_long');
assert.ok((await audioDuration(webmAt(60001), 'audio/webm', 120)) > 60);
const openSegmentWebm = Buffer.from(browserWebm);
openSegmentWebm[openSegmentWebm.indexOf(Buffer.from('18538067', 'hex')) + 4] = 0xff;
assert.ok((await audioDuration(openSegmentWebm, 'audio/webm', 60)) > 59);
const parsed = async () => ({ format: { container: 'WebM', duration: 60 } });
assert.equal(await audioDuration(browserWebm, 'audio/webm', 60, parsed), 60);
assert.equal(await audioDuration(Buffer.from('a'), 'audio/mp4', 60, async () => ({ format: { container: 'isom/mp42', duration: 3 } })), 3);
await rejectsCode(audioDuration(browserWebm, 'audio/webm', 60, async () => ({ format: { container: 'WebM', duration: 60.01 } })), 'speech_too_long');
await rejectsCode(audioDuration(Buffer.from('a'), 'audio/webm', 60), 'speech_invalid_audio');
await rejectsCode(audioDuration(Buffer.from('a'), 'audio/webm', 60, async () => { throw new Error('bad'); }), 'speech_invalid_audio');
await rejectsCode(audioDuration(Buffer.from('a'), 'audio/webm', 60, async () => ({ format: { container: 'MP4', duration: 1 } })), 'speech_invalid_audio');

const config = speechConfig();
const now = new Date('2026-09-27T12:00:00.000Z');
function ledgerClient(existing = []) {
  const rows = [...existing];
  const statements = [];
  const client = {
    async query(sql, params = []) {
      statements.push(sql);
      if (sql.startsWith('SELECT user_id')) return { rows };
      if (sql.startsWith('INSERT INTO')) rows.push({ user_id: params[1], duration_seconds: params[4], status: 'pending', created_at: params[5] });
      return { rows: [] };
    },
    release() {},
  };
  return { rows, statements, connect: async () => client };
}
const entry = (user_id, duration_seconds, created_at, status = 'succeeded') => ({ user_id, duration_seconds, created_at: new Date(created_at), status });
const admit = (ledger, overrides = {}, duration = 60, userId = 'me') =>
  admitSpeech({ userId, itemId: 'item', duration, config: { ...config, ...overrides }, now, connect: ledger.connect });

const empty = ledgerClient();
const admitted = await admit(empty);
assert.ok(admitted.id);
assert.equal(admitted.userRequestsRemainingToday, 29);
assert.equal(admitted.userSecondsRemainingToday, 1740);
assert.equal(empty.rows.length, 1);
assert.ok(empty.statements.some((sql) => sql.includes('pg_advisory_xact_lock')));
await rejectsCode(admit(ledgerClient([entry('me', 60, now)]), { userDailyRequests: 1 }), 'speech_user_daily_limit');
await rejectsCode(admit(ledgerClient([entry('other', 60, now)]), { globalDailyRequests: 1 }), 'speech_global_daily_limit');
await rejectsCode(admit(ledgerClient([entry('other', 60, '2026-09-26T23:59:59Z')]), { globalDailyRequests: 1 }), 'speech_global_daily_limit');
await rejectsCode(admit(ledgerClient([entry('other', 60, now)]), { globalMinuteRequests: 1 }), 'speech_global_minute_limit');
await rejectsCode(admit(ledgerClient([entry('other', 60, now)]), { globalHourlySeconds: 100 }), 'speech_global_hourly_limit');
await rejectsCode(admit(ledgerClient([entry('other', 60, now, 'pending')]), { maxConcurrent: 1 }), 'speech_concurrent_limit');
assert.ok((await admit(ledgerClient([entry('me', 60, '2026-09-26T23:59:59Z')]), { userDailyRequests: 1 })).id);
assert.ok((await admit(ledgerClient([entry('other', 60, '2026-09-27T11:58:59Z')]), { globalMinuteRequests: 1 })).id);
await rejectsCode(admit(ledgerClient([entry('me', 10, now)]), { userDailySeconds: 19 }, 10), 'speech_user_daily_limit');

const completions = [];
const admitStub = async () => ({ id: 'record-1', userRequestsRemainingToday: 29, resetsAt: 'tomorrow' });
const finishStub = async (...args) => completions.push(args);
const item = { id: 'item', response_json: { expected: 'Bonjour' } };
const request = { userId: 'me', item, audio: Buffer.from('audio'), mime: 'audio/webm', extension: 'webm', duration: 2, config, admit: admitStub, finish: finishStub };
const success = await transcribeSpeech({ ...request, fetchImpl: async (_url, options) => {
  assert.equal(options.body.get('language'), 'fr');
  assert.equal(options.body.get('model'), config.model);
  assert.equal(options.body.get('response_format'), 'verbose_json');
  assert.equal(options.body.get('timestamp_granularities[]'), 'word');
  return { ok: true, headers: new Headers(), json: async () => ({ text: 'bonjour', words: [{ word: 'bonjour', start: 0, end: 1.5 }] }) };
} });
assert.equal(success.feedback.mode, 'word_diff');
assert.deepEqual(success.pronunciation.unclear_words, []);
assert.deepEqual(pronunciationFeedback({ words: [
  { word: 'Je', start: 0, end: 0.2 }, { word: 'parle', start: 0.2, end: 0.6 },
  { word: 'lentement', start: 0.6, end: 2.1 },
] }).unclear_words.map((hint) => hint.word), ['lentement']);
assert.deepEqual(pronunciationFeedback({ words: [{ word: 'bonjour', start: 0, end: 0.4 }],
  segments: [{ start: 0, end: 0.4, avg_logprob: -1 }] }).unclear_words.map((hint) => hint.reason), ['uncertain_audio']);
assert.deepEqual(pronunciationFeedback({ words: [{ word: 'bonjour', start: 0, end: 0.4 }],
  segments: [{ start: 0, end: 0.4, avg_logprob: -0.1 }] }).unclear_words, []);
assert.equal(completions.at(-1)[1], 'succeeded');
assert.equal(completions.at(-1)[2].hash, transcriptHash('bonjour'));
const conversation = await transcribeSpeech({ ...request, item: { id: null, response_json: {} }, duration: 90,
  fetchImpl: async () => ({ ok: true, headers: new Headers(), json: async () => ({ text: 'Bonjour' }) }) });
assert.equal(conversation.feedback.mode, 'transcript_only');
await rejectsCode(transcribeSpeech({ ...request, fetchImpl: async () => ({ ok: true, headers: new Headers(), json: async () => ({ text: '' }) }) }), 'speech_no_speech');
assert.equal(completions.at(-1)[1], 'no_speech');
await rejectsCode(transcribeSpeech({ ...request, fetchImpl: async () => ({ status: 429, ok: false, headers: new Headers({ 'retry-after': '3' }) }) }), 'speech_provider_limited');
assert.equal(completions.at(-1)[1], 'provider_error');
await rejectsCode(transcribeSpeech({ ...request, fetchImpl: async () => { throw new DOMException('timeout', 'TimeoutError'); } }), 'speech_provider_timeout');

assert.deepEqual(await validateSpeakingCompletion('completed', 'me', 'item'), { completed: true });
assert.deepEqual(await validateSpeakingCompletion({ completed: true }, 'me', 'item'), { completed: true });
await rejectsCode(validateSpeakingCompletion({ completed: false }, 'me', 'item'), 'speech_completion_required');
await rejectsCode(validateSpeakingCompletion({ completed: true, transcript: 'bonjour' }, 'me', 'item'), 'speech_invalid_transcript');
const owned = async (_sql, params) => params[1] === 'me' && params[2] === 'item' && params[3] === transcriptHash('bonjour') ? [{ id: params[0] }] : [];
assert.deepEqual(await validateSpeakingCompletion({ completed: true, transcript: 'bonjour', transcription_id: 'record-1' }, 'me', 'item', owned), { completed: true, transcript: 'bonjour', transcription_id: 'record-1' });
await rejectsCode(validateSpeakingCompletion({ completed: true, transcript: 'bonjour', transcription_id: 'record-1' }, 'other', 'item', owned), 'speech_transcript_mismatch');
await rejectsCode(validateSpeakingCompletion({ completed: true, transcript: 'edited', transcription_id: 'record-1' }, 'me', 'item', owned), 'speech_transcript_mismatch');

console.log('speech checks passed');

assert.deepEqual(await validateSpeakingCompletion({completed:true,typed_text:' Bonjour. '},'me','item'),{completed:true,typed_text:'Bonjour.'});
await rejectsCode(validateSpeakingCompletion({completed:true,typed_text:''},'me','item'),'speech_invalid_typed_answer');
