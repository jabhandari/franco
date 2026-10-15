import { createHmac } from 'node:crypto';
import { normalizeTokens, wordOrderReference } from './evaluate.js';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function validPuzzleConfig(lives, minutes) {
  return [1, 3, 5].includes(lives) && [3, 5, null].includes(minutes);
}

export function levelOrder(score, random = Math.random) {
  const target = Math.min(LEVELS.length - 1, Math.floor(Math.max(0, score) / 4));
  const first = target < LEVELS.length - 1 && random() < 0.25 ? target + 1 : target;
  return [LEVELS[first], ...LEVELS.map((level, index) => ({ level, index }))
    .filter(({ index }) => index !== first)
    .sort((a, b) => Math.abs(a.index - target) - Math.abs(b.index - target) || a.index - b.index)
    .map(({ level }) => level)];
}

function token(secret, questionId, value) {
  return createHmac('sha256', secret).update(`${questionId}:${value}`).digest('hex').slice(0, 24);
}

export function originalChoiceId(row, submittedToken, secret) {
  const choices = row.response_json?.choices;
  if (!Array.isArray(choices)) return null;
  const choice = choices.find((option) => token(secret, row.id, `choice:${option.id ?? option.key}`) === submittedToken);
  return choice ? String(choice.id ?? choice.key) : null;
}

export function publicPuzzleQuestion(row, secret) {
  if (!row) return null;
  const data = row.response_json || {};
  const base = { id: row.id, level: row.cefr_level, type: row.item_type,
    prompt: row.prompt, context: row.context || null, instructions: row.instructions || null,
    audio_url: row.audio_url || null };
  if (row.item_type === 'word_order') {
    const tokens = Array.isArray(data.tokens) ? data.tokens : [];
    let shuffled = tokens.map((text, index) => ({ id: token(secret, row.id, `word:${index}`), text }))
      .sort((a, b) => a.id.localeCompare(b.id));
    // Never present the bank in answer order — the stored bank is shuffled,
    // so guarding against the stored order no longer protects the sentence.
    const answerOrder = normalizeTokens(wordOrderReference(row)).join(' ');
    if (shuffled.length > 1 && normalizeTokens(shuffled.map((item) => item.text)).join(' ') === answerOrder) {
      shuffled = [...shuffled.slice(1), shuffled[0]];
    }
    return { ...base, kind: 'word_order', tokens: shuffled };
  }
  const choices = Array.isArray(data.choices) ? data.choices : [];
  return { ...base, kind: 'choice', choices: choices.map((choice) => ({
    id: token(secret, row.id, `choice:${choice.id ?? choice.key}`), text: String(choice.text ?? ''),
  })).sort((a, b) => a.id.localeCompare(b.id)) };
}

export function puzzleReveal(row) {
  const data = row.response_json || {};
  const evaluation = row.evaluation_json || {};
  // Word-order reveals the stored sentence — the same source Practice shows —
  // never the raw word bank, which is stored shuffled.
  if (row.item_type === 'word_order') return wordOrderReference(row);
  const answer = String(data.answer ?? evaluation.answer ?? '');
  const choice = data.choices?.find((option) => String(option.id ?? option.key) === answer);
  return choice?.text || answer;
}
