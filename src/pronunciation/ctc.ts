// Greedy CTC decode: collapse consecutive IDs before removing the blank.
// This is the same decoding order used in the Python feasibility spike.
export function decodePhones(logits: Float32Array, frames: number, classes: number, vocab: string[]): string[] {
  if (frames < 1 || classes < 2 || logits.length !== frames * classes) throw new Error('Invalid phoneme logits.');
  const phones: string[] = [];
  let previous = -1;
  for (let frame = 0; frame < frames; frame += 1) {
    const offset = frame * classes;
    let best = 0;
    for (let index = 1; index < classes; index += 1) {
      if (logits[offset + index] > logits[offset + best]) best = index;
    }
    if (best !== previous && best !== 0 && vocab[best] && !vocab[best].startsWith('<')) phones.push(vocab[best]);
    previous = best;
  }
  return phones;
}
