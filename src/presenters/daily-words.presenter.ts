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

/** API path for the review history (last 7 days before today). */
export function wordsHistoryPath(timeZone: string = browserTimeZone()): string {
  return `/api/me/words/history?tz=${encodeURIComponent(timeZone || 'UTC')}`;
}

/** "Yesterday" for the day before todayStr, else "Thu, Oct 15". */
export function historyDayLabel(date: string, today: string): string {
  const prev = new Date(`${today}T12:00:00Z`);
  prev.setUTCDate(prev.getUTCDate() - 1);
  if (prev.toISOString().slice(0, 10) === date) return 'Yesterday';
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
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

export type WordsTeaser = { kicker: string; title: string; subtitle: string; progressLabel: string; done: boolean };

/** Home teaser card copy: headline + progress only — the words themselves
 * live on the words page so Home stays light. */
export function wordsTeaser(data: { level: string; answered_count: number; total_questions: number; completed: boolean }): WordsTeaser {
  return {
    kicker: `WORDS OF THE DAY · ${data.level}`,
    title: data.completed ? 'Words of the day — done' : 'Five new words for today',
    subtitle: data.completed ? 'Come back tomorrow for five more.' : `${data.total_questions} quick questions · about 2 minutes`,
    progressLabel: practiceProgress(data.answered_count, data.total_questions),
    done: data.completed,
  };
}

/** First question the learner has not answered yet (null when complete). */
export function nextQuestion(questions: WordQuestion[], answered: Record<string, { correct: boolean }>): WordQuestion | null {
  return questions.find((q) => !answered[q.id]) || null;
}
