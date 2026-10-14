import { speechFeedback } from './speech-feedback.js';

// Whisper exposes word timings but only segment-level log probabilities. The
// percentage below is an audio/transcription certainty proxy, not a calibrated
// probability that a learner pronounced a particular word correctly.
export function pronunciationFeedback(payload, expected) {
  const words = Array.isArray(payload?.words) ? payload.words : [];
  const segments = Array.isArray(payload?.segments) ? payload.segments : [];
  const timed = words.filter((word) => typeof word.word === 'string'
    && Number.isFinite(word.start) && Number.isFinite(word.end)
    && word.end > word.start && word.end - word.start < 10).slice(0, 100);
  const durations = timed.map((word) => word.end - word.start).sort((a, b) => a - b);
  const median = durations[Math.floor(durations.length / 2)] || 0;
  const unclear_words = [];
  for (const word of timed) {
    const midpoint = (word.start + word.end) / 2;
    const segment = segments.find((part) => Number.isFinite(part.start)
      && Number.isFinite(part.end) && midpoint >= part.start && midpoint <= part.end);
    const lowSegmentConfidence = Number.isFinite(segment?.avg_logprob) && segment.avg_logprob < -0.8;
    const unusuallySlow = durations.length >= 3 && word.end - word.start > Math.max(1.2, median * 2.5);
    if (!lowSegmentConfidence && !unusuallySlow) continue;
    unclear_words.push({ word: word.word.trim(), start: word.start, end: word.end,
      reason: lowSegmentConfidence ? 'uncertain_audio' : 'slow_audio' });
    if (unclear_words.length === 4) break;
  }
  const comparison = speechFeedback(expected, payload?.text);
  const segmentLogprobs = segments.map((segment) => segment?.avg_logprob).filter(Number.isFinite);
  const audio_confidence_percent = segmentLogprobs.length
    ? Math.round(Math.exp(Math.min(0, segmentLogprobs.reduce((sum, value) => sum + value, 0) / segmentLogprobs.length)) * 100)
    : null;
  const normalize = (value) => String(value || '').normalize('NFKC').toLowerCase()
    .normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, '');
  let nextTimed = 0;
  const word_signals = comparison.mode === 'word_diff' ? comparison.expected.map((token) => {
    if (token.status !== 'matched') return { word: token.text, status: 'not_recognized', audio_confidence_percent: null };
    const found = timed.findIndex((word, index) => index >= nextTimed && normalize(word.word) === normalize(token.text));
    const timedWord = found >= 0 ? timed[found] : null;
    if (found >= 0) nextTimed = found + 1;
    const midpoint = timedWord ? (timedWord.start + timedWord.end) / 2 : null;
    const segment = midpoint === null && comparison.expected.length === 1 && segments.length === 1
      ? segments[0] : segments.find((part) => midpoint !== null && Number.isFinite(part.start)
        && Number.isFinite(part.end) && midpoint >= part.start && midpoint <= part.end);
    const audio_confidence_percent = Number.isFinite(segment?.avg_logprob)
      ? Math.round(Math.exp(Math.min(0, segment.avg_logprob)) * 100) : null;
    return { word: token.text, status: 'recognized', audio_confidence_percent };
  }) : [];
  return { mode: 'recording_hints', unclear_words, word_signals, audio_confidence_percent };
}
