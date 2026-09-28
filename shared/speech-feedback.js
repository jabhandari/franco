// A transcript comparison for scripted practice. These statuses describe text
// recognition, not the quality of a learner's pronunciation.
export function speechFeedback(expected, transcript) {
  if (typeof expected !== 'string' || !expected.trim()) return { mode: 'transcript_only' };
  const words = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).slice(0, 500);
  const expectedWords = words(expected);
  const heardWords = words(transcript);
  const normalize = (word) => word.normalize('NFKC').replace(/[‘’‛ʼ]/g, "'").toLowerCase()
    .normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  const a = expectedWords.map(normalize);
  const b = heardWords.map(normalize);
  const table = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] && a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const expectedTokens = [];
  const heardTokens = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] && a[i] === b[j]) {
      expectedTokens.push({ text: expectedWords[i++], status: 'matched' });
      heardTokens.push({ text: heardWords[j++], status: 'matched' });
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      expectedTokens.push({ text: expectedWords[i++], status: 'missed' });
    } else {
      heardTokens.push({ text: heardWords[j++], status: 'extra' });
    }
  }
  while (i < a.length) expectedTokens.push({ text: expectedWords[i++], status: 'missed' });
  while (j < b.length) heardTokens.push({ text: heardWords[j++], status: 'extra' });
  return { mode: 'word_diff', expected: expectedTokens, heard: heardTokens };
}
