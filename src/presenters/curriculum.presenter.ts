import type { CurriculumQuestion } from '../types';
const normalize = (value: string): string => value.normalize('NFKC').trim().toLocaleLowerCase('fr').replace(/[’]/g, "'").replace(/\s+/g, ' ');
export function curriculumAnswer(question: CurriculumQuestion, response: string): { correct: boolean; message: string } {
  const correct = question.correct_answers.some(answer => normalize(answer) === normalize(response));
  return { correct, message: correct ? `Correct. ${question.feedback.rule}` : `${question.feedback.error} ${question.feedback.rule} Try this: ${question.feedback.remediation}` };
}
export function curriculumReviewDays(correct: number, total: number, policy: { initial_days: number; subsequent_days: number[] }): number {
  return total > 0 && correct === total ? policy.subsequent_days[0] ?? policy.initial_days : policy.initial_days;
}
// Display text for a question's correct answer(s): choice ids resolve to
// their choice labels, free-text answers render as authored.
export function curriculumCorrectAnswerText(question: CurriculumQuestion): string {
  return question.correct_answers.map(value => question.choices?.find(choice => choice.id === value)?.text ?? value).join(' / ');
}
// Mastery prompts may embed a word bank: "… Word bank: Sami. / je /
// m'appelle". Splits it into the bare prompt plus the bank tokens, in
// authored order. Returns null when the prompt carries no usable bank.
export type WordBank = { prompt: string; tokens: string[] };
export function parseWordBank(prompt: string): WordBank | null {
  const marker = 'Word bank:';
  const at = prompt.indexOf(marker);
  if (at < 0) return null;
  const tokens = prompt.slice(at + marker.length).split('/').map(token => token.trim()).filter(Boolean);
  if (!tokens.length) return null;
  return { prompt: prompt.slice(0, at).trim(), tokens };
}
