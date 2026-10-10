// FRA-21 presenter: pure vocabulary-word helpers moved verbatim from
// src/components/concepts.jsx. No JSX, no hooks, no side effects.
import { safeText } from './format.presenter.js';

// Learner-facing labels for Lexique part-of-speech codes stored in the
// vocabulary topic rows (e.g. {"lemma":"accord","pos":"NOM","gender":"m",...}).
export const POS_LABELS = {
  NOM: 'noun', VER: 'verb', AUX: 'auxiliary verb', ADJ: 'adjective',
  ADV: 'adverb', PRE: 'preposition', PRO: 'pronoun', CON: 'conjunction',
  ART: 'article', DET: 'determiner', NUM: 'number',
  INT: 'interjection', ONO: 'interjection',
};

/**
 * Turn a vocabulary topic's item value into a short human-readable
 * description. Vocabulary rows store Lexique metadata as a JSON string;
 * render it as "noun · masculine · very common (#145)" instead of raw JSON.
 * Plain-text topics (e.g. "le / la / l’ / les") render unchanged.
 * @param {*} item
 * @returns {string}
 */
export function describeWord(item) {
  if (typeof item !== 'string') return safeText(item);
  let parsed = null;
  try { parsed = JSON.parse(item); } catch { parsed = null; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !parsed.pos) {
    return safeText(item);
  }
  const posKey = String(parsed.pos).split(':')[0].toUpperCase();
  const parts = [POS_LABELS[posKey] || posKey.toLowerCase()];
  if (parsed.gender === 'm') parts.push('masculine');
  if (parsed.gender === 'f') parts.push('feminine');
  if (parsed.number === 's') parts.push('singular');
  if (parsed.number === 'p') parts.push('plural');
  const rank = Number(parsed.freq_rank);
  if (Number.isFinite(rank) && rank > 0) {
    const bucket = rank <= 100 ? 'very common' : rank <= 1000 ? 'common' : 'less common';
    parts.push(`${bucket} (#${rank})`);
  }
  return parts.join(' · ');
}
