// FRA-21 presenter: pure read-only projections of an attempt result.
// Used by every exercise renderer (MultipleChoice, Spelling, WordOrder,
// PronunciationDrill) so the answered/feedback expressions live in one place.
// No JSX, no hooks, no side effects.

/** The attempt result shape these projections read (may carry { error }). */
export interface AttemptResult {
  correct?: unknown;
  error?: unknown;
  [key: string]: unknown;
}

export type AnsweredState = 'correct' | 'wrong' | null;
export type FeedbackTone = 'correct' | 'incorrect';

/**
 * Shell answered-state for an attempt result.
 */
export function answeredState(result: AttemptResult | null | undefined): AnsweredState {
  if (!result || result.error) return null;
  return result.correct ? 'correct' : 'wrong';
}

/**
 * Whether the result is a real (non-error) answer.
 */
export function hasResult(result: AttemptResult | null | undefined): boolean {
  return Boolean(result && !result.error);
}

/**
 * Feedback tone for a result.
 */
export function feedbackTone(result: AttemptResult | null | undefined): FeedbackTone {
  return result && result.correct ? 'correct' : 'incorrect';
}

/**
 * Feedback headline for a result.
 */
export function feedbackTitle(result: AttemptResult | null | undefined): 'Correct!' | 'Not quite.' {
  return result && result.correct ? 'Correct!' : 'Not quite.';
}

/**
 * Milliseconds elapsed since an attempt started.
 * @param startedAt - Date.now() captured when the attempt began
 */
export function elapsedMs(startedAt: number): number {
  return Date.now() - startedAt;
}
