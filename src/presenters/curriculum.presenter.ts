import type { CurriculumQuestion } from '../types';
const normalize = (value: string): string => value.normalize('NFKC').trim().toLocaleLowerCase('fr').replace(/[’]/g, "'").replace(/\s+/g, ' ');
export function curriculumAnswer(question: CurriculumQuestion, response: string): { correct: boolean; message: string } {
  const correct = question.correct_answers.some(answer => normalize(answer) === normalize(response));
  return { correct, message: correct ? `Correct. ${question.feedback.rule}` : `${question.feedback.error} ${question.feedback.rule} Try this: ${question.feedback.remediation}` };
}
export function curriculumReviewDays(correct: number, total: number, policy: { initial_days: number; subsequent_days: number[] }): number {
  return total > 0 && correct === total ? policy.subsequent_days[0] ?? policy.initial_days : policy.initial_days;
}
