import { createHmac } from 'node:crypto';
import { normalizeText } from './evaluate.js';
import { publicPuzzleQuestion } from './puzzle-rules.js';

export const RACE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function validRaceConfig(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && ['past_questions', 'lesson_exercises'].includes(value.source)
    && RACE_LEVELS.includes(value.level)
    && Number.isInteger(value.question_count) && value.question_count >= 1 && value.question_count <= 30
    && [null, 1, 3, 5].includes(value.lives)
    && (value.timer_seconds === null || Number.isInteger(value.timer_seconds)
      && value.timer_seconds >= 60 && value.timer_seconds <= 1800);
}

function parseChoices(raw) {
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw;
}

// Only use source rows for which a displayed choice maps unambiguously to the
// server's answer. This avoids turning subjective or free-text work into races.
export function raceChoices(row) {
  const raw = parseChoices(row.choices_json);
  const choices = Array.isArray(raw)
    ? raw.map((choice, index) => typeof choice === 'string'
      ? { id: String(index), text: choice }
      : { id: String(choice?.key ?? choice?.id ?? index), text: choice?.text })
    : raw && typeof raw === 'object'
      ? Object.entries(raw).map(([id, text]) => ({ id, text })) : [];
  if (choices.length < 2 || choices.length > 8 || choices.some((choice) =>
    typeof choice.text !== 'string' || !choice.text.trim() || choice.text.length > 500)) return null;
  if (new Set(choices.map((choice) => choice.id)).size !== choices.length) return null;
  const answer = normalizeText(row.answer);
  if (!answer) return null;
  const matches = choices.filter((choice) => normalizeText(choice.id) === answer || normalizeText(choice.text) === answer);
  if (matches.length !== 1) return null;
  return choices;
}

function choiceToken(secret, questionId, choiceId) {
  return createHmac('sha256', secret).update(`race:${questionId}:${choiceId}`).digest('hex').slice(0, 24);
}

export function publicRaceQuestion(row, secret, kind = 'exam_question') {
  if (!row) return null;
  if (kind === 'content_item') return publicPuzzleQuestion(row, secret);
  const choices = raceChoices(row);
  if (!choices) return null;
  return { id: row.id, kind: 'choice', level: row.cefr_section, prompt: row.prompt,
    context: row.context ?? row.source_text ?? null,
    choices: choices.map((choice) => ({ id: choiceToken(secret, row.id, choice.id), text: choice.text })) };
}

export function resolveRaceChoice(row, response, secret) {
  if (typeof response !== 'string') return null;
  const choices = raceChoices(row);
  return choices?.find((choice) => choiceToken(secret, row.id, choice.id) === response) ?? null;
}

export function raceWinner(players) {
  if (players.length !== 2 || players.some((player) => !player.finished_at)) return null;
  if (Boolean(players[0].forfeited_at) !== Boolean(players[1].forfeited_at)) {
    return players[0].forfeited_at ? players[1].seat : players[0].seat;
  }
  if (players[0].correct_count !== players[1].correct_count) {
    return players[0].correct_count > players[1].correct_count ? players[0].seat : players[1].seat;
  }
  const first = new Date(players[0].finished_at).getTime();
  const second = new Date(players[1].finished_at).getTime();
  return first === second ? 'tie' : first < second ? players[0].seat : players[1].seat;
}
