export function hasClearSpeech(samples: Float32Array): boolean {
  const frameSize = 320;
  const levels: number[] = [];
  for (let start = 0; start + frameSize <= samples.length; start += frameSize) {
    let energy = 0;
    for (let index = start; index < start + frameSize; index += 1) energy += samples[index] * samples[index];
    levels.push(Math.sqrt(energy / frameSize));
  }
  if (levels.length < 13) return false;
  const ordered = [...levels].sort((left, right) => left - right);
  const noise = ordered[Math.floor(ordered.length * 0.2)];
  const speech = ordered[Math.floor(ordered.length * 0.85)];
  const threshold = Math.max(0.018, noise * 2.5);
  return speech >= threshold && levels.filter((level) => level >= threshold).length >= 8;
}
