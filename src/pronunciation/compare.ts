export type TargetWord = { id: string; word: string; phones: string[]; hint: string };

// These phonemes use the pinned model's eSpeak-compatible vocabulary.
export const TARGET_WORDS: TargetWord[] = [
  { id: 'rentrer', word: 'rentrer', phones: ['ʁ', 'ɑ̃', 't', 'ʁ', 'e'], hint: 'to return' },
  { id: 'bonjour', word: 'bonjour', phones: ['b', 'ɔ̃', 'ʒ', 'u', 'ʁ'], hint: 'hello' },
  { id: 'merci', word: 'merci', phones: ['m', 'ɛ', 'ʁ', 's', 'i'], hint: 'thank you' },
  { id: 'ouais', word: 'ouais', phones: ['w', 'ɛ'], hint: 'yeah' },
];

export function findTargetWord(text: string): TargetWord | null {
  const normalized = text.trim().toLocaleLowerCase('fr').replace(/[.!?…]+$/, '');
  return TARGET_WORDS.find((target) => target.word === normalized) || null;
}

export type SoundMatch = { expected: string; heard: string | null; status: 'matched' | 'different' | 'missing' };
export type SoundComparison = { similarity: number; matched: number; expectedCount: number; extra: string[]; sounds: SoundMatch[] };

export function comparePhones(expected: string[], heard: string[]): SoundComparison {
  const rows = expected.length + 1;
  const columns = heard.length + 1;
  const costs = Array.from({ length: rows }, () => Array<number>(columns).fill(0));
  for (let row = 0; row < rows; row += 1) costs[row][0] = row;
  for (let column = 0; column < columns; column += 1) costs[0][column] = column;
  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const substitution = expected[row - 1] === heard[column - 1] ? 0 : 1;
      costs[row][column] = Math.min(costs[row - 1][column - 1] + substitution,
        costs[row - 1][column] + 1, costs[row][column - 1] + 1);
    }
  }

  const sounds: SoundMatch[] = [];
  const extra: string[] = [];
  let row = expected.length;
  let column = heard.length;
  while (row > 0 || column > 0) {
    const same = row > 0 && column > 0 && expected[row - 1] === heard[column - 1];
    if (same && costs[row][column] === costs[row - 1][column - 1]) {
      sounds.push({ expected: expected[row - 1], heard: heard[column - 1], status: 'matched' });
      row -= 1; column -= 1;
    } else if (column > 0 && costs[row][column] === costs[row][column - 1] + 1) {
      extra.push(heard[column - 1]); column -= 1;
    } else if (row > 0 && costs[row][column] === costs[row - 1][column] + 1) {
      sounds.push({ expected: expected[row - 1], heard: null, status: 'missing' }); row -= 1;
    } else {
      sounds.push({ expected: expected[row - 1], heard: heard[column - 1], status: 'different' });
      row -= 1; column -= 1;
    }
  }
  sounds.reverse(); extra.reverse();
  const matched = sounds.filter((sound) => sound.status === 'matched').length;
  return { similarity: expected.length ? Math.round(matched / Math.max(expected.length, heard.length) * 100) : 0,
    matched, expectedCount: expected.length, extra, sounds };
}
