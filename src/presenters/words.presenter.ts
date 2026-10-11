// FRA-21 presenter: pure vocabulary-word helpers moved verbatim from
// src/components/concepts.jsx. No JSX, no hooks, no side effects.
import { safeText, isRecord } from './format.presenter.ts';

// Learner-facing labels for Lexique part-of-speech codes stored in the
// vocabulary topic rows (e.g. {"lemma":"accord","pos":"NOM","gender":"m",...}).
export const POS_LABELS: Record<string, string> = {
  NOM: 'noun', VER: 'verb', AUX: 'auxiliary verb', ADJ: 'adjective',
  ADV: 'adverb', PRE: 'preposition', PRO: 'pronoun', CON: 'conjunction',
  ART: 'article', DET: 'determiner', NUM: 'number',
  INT: 'interjection', ONO: 'interjection',
};

/** Lexique metadata fields read from a parsed vocabulary JSON string. */
export interface LexiqueMeta {
  pos?: unknown;
  gender?: unknown;
  number?: unknown;
  freq_rank?: unknown;
  [key: string]: unknown;
}

/**
 * Turn a vocabulary topic's item value into a short human-readable
 * description. Vocabulary rows store Lexique metadata as a JSON string;
 * render it as "noun · masculine · very common (#145)" instead of raw JSON.
 * Plain-text topics (e.g. "le / la / l’ / les") render unchanged.
 */
export function describeWord(item: unknown): string {
  if (typeof item !== 'string') return safeText(item);
  let parsed: unknown = null;
  try { parsed = JSON.parse(item); } catch { parsed = null; }
  if (!isRecord(parsed) || !parsed.pos) {
    return safeText(item);
  }
  const word: LexiqueMeta = parsed;
  const posKey = String(word.pos).split(':')[0].toUpperCase();
  const parts: string[] = [POS_LABELS[posKey] || posKey.toLowerCase()];
  if (word.gender === 'm') parts.push('masculine');
  if (word.gender === 'f') parts.push('feminine');
  if (word.number === 's') parts.push('singular');
  if (word.number === 'p') parts.push('plural');
  const rank = Number(word.freq_rank);
  if (Number.isFinite(rank) && rank > 0) {
    const bucket = rank <= 100 ? 'very common' : rank <= 1000 ? 'common' : 'less common';
    parts.push(`${bucket} (#${rank})`);
  }
  return parts.join(' · ');
}
