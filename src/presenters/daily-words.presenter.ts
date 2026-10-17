// FRA-155 presenter: pure shaping for the Home Words of the Day card.
// No JSX, no hooks, no side effects. The server owns selection and grading
// (server/words-of-day.js); this module owns how the payload reads.
import type { DailyWord, WordQuestion } from '../api/client.js';
import { browserTimeZone } from './streak.presenter.ts';

/** API path for today's words, scoped to the learner's timezone. */
export function dailyWordsPath(timeZone: string = browserTimeZone()): string {
  return `/api/me/words/today?tz=${encodeURIComponent(timeZone || 'UTC')}`;
}

/** "noun" / "verb · Review" — part of speech plus the recycle label. */
export function wordMeta(word: DailyWord): string {
  const parts: string[] = [word.part_of_speech];
  if (word.is_recycled) parts.push('Review');
  return parts.join(' · ');
}

/** Short heading per question type, shown above each practice question. */
export function questionHeading(question: WordQuestion): string {
  if (question.type === 'meaning') return 'What does it mean?';
  if (question.type === 'word') return 'Find the French word';
  return 'Complete the sentence';
}

/** "3 of 10 answered" — or the finished state for the day. */
export function practiceProgress(answeredCount: number, totalQuestions: number): string {
  if (totalQuestions > 0 && answeredCount >= totalQuestions) return 'Done for today — come back tomorrow';
  return `${answeredCount} of ${totalQuestions} answered`;
}

/** First question the learner has not answered yet (null when complete). */
export function nextQuestion(questions: WordQuestion[], answered: Record<string, { correct: boolean }>): WordQuestion | null {
  return questions.find((q) => !answered[q.id]) || null;
}
