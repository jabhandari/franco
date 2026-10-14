// Whisper exposes word timings but only segment-level log probabilities. Treat
// these as tentative recording hints, never as a pronunciation assessment.
export function pronunciationFeedback(payload) {
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
  return { mode: 'recording_hints', unclear_words };
}
