import { createHash, randomUUID } from 'node:crypto';
import { parseBuffer } from 'music-metadata';
import { pool, query } from './database.js';
import { speechFeedback } from './evaluate.js';
import { webmDurationSeconds } from './webm-duration.js';
import { pronunciationFeedback } from '../shared/pronunciation-feedback.js';

export class SpeechError extends Error {
  constructor(status, code, message, retryAfter = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

const setting = (name, fallback) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value <= 0) throw new Error(name + ' must be a positive number.');
  return value;
};

export const speechConfig = () => ({
  enabled: process.env.SPEECH_TRANSCRIPTION_ENABLED === 'true' && Boolean(process.env.GROQ_API_KEY),
  model: process.env.GROQ_SPEECH_MODEL || 'whisper-large-v3-turbo',
  maxSeconds: Math.min(60, setting('SPEECH_MAX_SECONDS', 60)),
  maxBytes: Math.min(8388608, setting('SPEECH_MAX_BYTES', 8388608)),
  timeoutMs: setting('SPEECH_PROVIDER_TIMEOUT_MS', 30000),
  maxConcurrent: setting('SPEECH_MAX_CONCURRENT', 4),
  userDailyRequests: setting('SPEECH_USER_DAILY_REQUESTS', 30),
  userDailySeconds: setting('SPEECH_USER_DAILY_SECONDS', 1800),
  globalMinuteRequests: setting('SPEECH_GLOBAL_MINUTE_REQUESTS', 18),
  globalHourlySeconds: setting('SPEECH_GLOBAL_HOURLY_SECONDS', 6480),
  globalDailyRequests: setting('SPEECH_GLOBAL_DAILY_REQUESTS', 1800),
  globalDailySeconds: setting('SPEECH_GLOBAL_DAILY_SECONDS', 25920),
});

const mimeExtensions = new Map([
  ['audio/webm', 'webm'],
  ['audio/mp4', 'm4a'],
  ['audio/ogg', 'ogg'],
]);

export function audioMime(contentType) {
  const normalized = String(contentType || '').toLowerCase().replace(/\s+/g, '');
  const mime = normalized.split(';')[0];
  if (!mimeExtensions.has(mime) || (mime === 'audio/webm' && normalized.includes('codecs=') && !normalized.includes('codecs=opus'))) {
    throw new SpeechError(415, 'speech_unsupported_format', 'This browser produced an unsupported audio format.');
  }
  return { mime, extension: mimeExtensions.get(mime) };
}

export async function readAudio(req, maxBytes) {
  const claimed = Number(req.headers['content-length']);
  if (Number.isFinite(claimed) && claimed > maxBytes) {
    req.resume();
    throw new SpeechError(413, 'speech_too_large', 'The recording is too large. Please record a shorter sample.');
  }
  let total = 0;
  let overflow = false;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      overflow = true;
      continue;
    }
    chunks.push(chunk);
  }
  if (overflow) throw new SpeechError(413, 'speech_too_large', 'The recording is too large. Please record a shorter sample.');
  if (!total) throw new SpeechError(400, 'speech_empty_audio', 'Record some speech before submitting.');
  return Buffer.concat(chunks, total);
}

export async function audioDuration(audio, mime, maxSeconds, metadataParser = parseBuffer) {
  let metadata;
  try {
    metadata = await metadataParser(audio, { mimeType: mime, size: audio.length }, { duration: true, skipCovers: true });
  } catch {
    throw new SpeechError(400, 'speech_invalid_audio', 'The recording could not be read. Please record again.');
  }
  const container = String(metadata.format.container || '').toLowerCase();
  const expected = mime === 'audio/webm' ? 'webm' : mime === 'audio/ogg' ? 'ogg' : 'mp4';
  const containerMatches = container.includes(expected) || (mime === 'audio/mp4' && container.split('/').some((brand) => /^(isom|iso\d|mp4\d|m4a|m4b|m4p|qt)$/.test(brand)));
  let duration = metadata.format.duration;
  if (containerMatches && mime === 'audio/webm') {
    try {
      const timestampDuration = webmDurationSeconds(audio);
      if (timestampDuration !== null) duration = Math.max(duration || 0, timestampDuration);
    } catch {
      throw new SpeechError(400, 'speech_invalid_audio', 'The recording could not be read. Please record again.');
    }
  }
  if (!containerMatches || metadata.format.hasAudio === false || !Number.isFinite(duration) || duration <= 0) {
    throw new SpeechError(400, 'speech_invalid_audio', 'The recording could not be read. Please record again.');
  }
  if (duration > maxSeconds) {
    throw new SpeechError(400, 'speech_too_long', 'Recordings must be 60 seconds or less.');
  }
  return duration;
}

const utcDayStart = (now) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const billedSeconds = (seconds) => Math.max(seconds, 10);

function quotaError(code, message, rows, now, windowMs) {
  const oldest = rows.length ? Math.min(...rows.map((row) => new Date(row.created_at).getTime())) : now.getTime();
  const retryAfter = Math.max(1, Math.ceil((oldest + windowMs - now.getTime()) / 1000));
  return new SpeechError(429, code, message, retryAfter);
}

export async function admitSpeech({ userId, itemId, duration, config, now = new Date(), connect = () => pool.connect() }) {
  const client = await connect();
  const dayStart = utcDayStart(now);
  let inTransaction = false;
  try {
    await client.query('BEGIN');
    inTransaction = true;
    await client.query('SELECT pg_advisory_xact_lock($1, $2)', [824214, 10]);
    const { rows } = await client.query(
      'SELECT user_id,duration_seconds,status,created_at FROM speech_transcriptions WHERE created_at >= $1 ORDER BY created_at',
      [new Date(now.getTime() - 86400000)]
    );
    const today = rows.filter((row) => new Date(row.created_at) >= dayStart);
    const rollingDay = rows.filter((row) => new Date(row.created_at).getTime() > now.getTime() - 86400000);
    const mine = today.filter((row) => row.user_id === userId);
    const minute = rows.filter((row) => new Date(row.created_at).getTime() > now.getTime() - 60000);
    const hour = rows.filter((row) => new Date(row.created_at).getTime() > now.getTime() - 3600000);
    const pending = rows.filter((row) => row.status === 'pending' && new Date(row.created_at).getTime() > now.getTime() - 90000);
    const dailyReset = new Date(dayStart.getTime() + 86400000);
    const dailyRetry = Math.max(1, Math.ceil((dailyReset.getTime() - now.getTime()) / 1000));
    if (mine.length >= config.userDailyRequests || mine.reduce((sum, row) => sum + billedSeconds(row.duration_seconds), 0) + billedSeconds(duration) > config.userDailySeconds) {
      throw new SpeechError(429, 'speech_user_daily_limit', 'Your speech practice limit is reached for today. You can still mark this exercise complete.', dailyRetry);
    }
    if (rollingDay.length >= config.globalDailyRequests || rollingDay.reduce((sum, row) => sum + billedSeconds(row.duration_seconds), 0) + billedSeconds(duration) > config.globalDailySeconds) {
      throw quotaError('speech_global_daily_limit', 'Shared transcription capacity is used up. Please try later.', rollingDay, now, 86400000);
    }
    if (minute.length >= config.globalMinuteRequests) {
      throw quotaError('speech_global_minute_limit', 'Transcription is busy. Please try again shortly.', minute, now, 60000);
    }
    if (hour.reduce((sum, row) => sum + billedSeconds(row.duration_seconds), 0) + billedSeconds(duration) > config.globalHourlySeconds) {
      throw quotaError('speech_global_hourly_limit', 'Shared transcription capacity is temporarily used up. Please try later.', hour, now, 3600000);
    }
    if (pending.length >= config.maxConcurrent) {
      throw new SpeechError(429, 'speech_concurrent_limit', 'Transcription is busy. Please try again shortly.', 10);
    }
    const id = randomUUID();
    await client.query(
      'INSERT INTO speech_transcriptions(id,user_id,item_id,model,duration_seconds,created_at) VALUES($1,$2,$3,$4,$5,$6)',
      [id, userId, itemId, config.model, duration, now]
    );
    await client.query('COMMIT');
    inTransaction = false;
    const secondsRemaining = Math.max(0, config.userDailySeconds - mine.reduce((sum, row) => sum + billedSeconds(row.duration_seconds), 0) - billedSeconds(duration));
    return { id, userRequestsRemainingToday: Math.max(0, config.userDailyRequests - mine.length - 1), userSecondsRemainingToday: secondsRemaining, resetsAt: dailyReset.toISOString() };
  } catch (error) {
    if (inTransaction) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function finishSpeech(id, status, { hash = null, providerId = null, code = null } = {}) {
  await query(
    'UPDATE speech_transcriptions SET status=?,transcript_hash=?,provider_request_id=?,error_code=?,completed_at=NOW() WHERE id=?',
    [status, hash, providerId, code, id]
  );
}

export const transcriptHash = (transcript) => createHash('sha256').update(transcript).digest('hex');

export async function validateSpeakingCompletion(response, userId, itemId, lookup = query) {
  if (response !== 'completed' && !(response && typeof response === 'object' && !Array.isArray(response) && response.completed === true)) {
    throw new SpeechError(400, 'speech_completion_required', 'Speaking completion is required.');
  }
  const transcriptionId = response?.transcription_id;
  const transcript = response?.transcript;
  if (!transcriptionId && !transcript) {
    if (response?.typed_text !== undefined) {
      if (typeof response.typed_text !== 'string' || !response.typed_text.trim() || response.typed_text.length > 10000) throw new SpeechError(400,'speech_invalid_typed_answer','Enter a short speaking answer.');
      return { completed:true,typed_text:response.typed_text.trim() };
    }
    return { completed: true };
  }
  if (typeof transcriptionId !== 'string' || typeof transcript !== 'string' || !transcript.trim() || transcript.length > 10000) {
    throw new SpeechError(400, 'speech_invalid_transcript', 'A valid transcription ID and transcript are required.');
  }
  const rows = await lookup("SELECT id FROM speech_transcriptions WHERE id=? AND user_id=? AND item_id=? AND status='succeeded' AND transcript_hash=?", [transcriptionId, userId, itemId, transcriptHash(transcript)]);
  if (!rows[0]) throw new SpeechError(400, 'speech_transcript_mismatch', 'This transcript does not belong to this speaking exercise.');
  return { completed: true, transcript, transcription_id: transcriptionId };
}


export async function transcribeSpeech({ userId, item, audio, mime, extension, duration, config, expected, fetchImpl = fetch, admit = admitSpeech, finish = finishSpeech }) {
  const admitted = await admit({ userId, itemId: item.id, duration, config });
  let status = 'provider_error';
  let code = 'speech_provider_error';
  let providerId = null;
  let hash = null;
  try {
    const form = new FormData();
    form.append('file', new Blob([audio], { type: mime }), 'recording.' + extension);
    form.append('model', config.model);
    form.append('language', 'fr');
    form.append('temperature', '0');
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'word');
    const response = await fetchImpl('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + process.env.GROQ_API_KEY },
      body: form,
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    providerId = response.headers.get('x-groq-id');
    if (response.status === 429) {
      if (response.body) response.body.cancel().catch(() => {});
      code = 'speech_provider_limited';
      const retryAfter = Math.min(3600, Math.max(1, Number(response.headers.get('retry-after')) || 60));
      throw new SpeechError(429, code, 'The transcription provider is at capacity. Please try later.', retryAfter);
    }
    if (!response.ok) {
      response.body?.cancel();
      code = 'speech_provider_http_' + response.status;
      throw new SpeechError(502, code, 'Transcription is unavailable right now. Please try again later.');
    }
    let payload;
    try { payload = await response.json(); } catch { throw new SpeechError(502, code, 'The transcription provider returned an unreadable result.'); }
    providerId ||= payload?.x_groq?.id || null;
    const transcript = typeof payload?.text === 'string' ? payload.text.trim() : '';
    if (!transcript) {
      status = 'no_speech';
      code = 'speech_no_speech';
      throw new SpeechError(422, code, 'No speech was detected. Please record again.');
    }
    hash = transcriptHash(transcript);
    status = 'succeeded';
    code = null;
    return {
      transcription_id: admitted.id,
      transcript,
      duration_seconds: duration,
      feedback: speechFeedback(expected ?? item.response_json?.expected, transcript),
      pronunciation: pronunciationFeedback(payload),
      quota: { user_requests_remaining_today: admitted.userRequestsRemainingToday, user_audio_seconds_remaining_today: admitted.userSecondsRemainingToday, resets_at: admitted.resetsAt },
    };
  } catch (error) {
    if (error instanceof SpeechError) throw error;
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      code = 'speech_provider_timeout';
      throw new SpeechError(502, code, 'Transcription timed out. Please try again later.');
    }
    throw new SpeechError(502, code, 'Transcription is unavailable right now. Please try again later.');
  } finally {
    await finish(admitted.id, status, { hash, providerId, code });
  }
}
