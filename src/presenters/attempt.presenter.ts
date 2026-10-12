// FRA-21 presenter: pure read-only projections of an attempt result.
// Used by every exercise renderer (MultipleChoice, Spelling, WordOrder,
// PronunciationDrill) so the answered/feedback expressions live in one place.
// No JSX, no hooks, no side effects.
/**
 * Graded-attempt JSON from POST /api/me/attempts on success
 * ({ attempt, correct, score, reveal, next_due_at }), or { error } when
 * reporting failed. Renderers read correct/error/reveal.
 */
export type AttemptResult = {
  attempt?: {
    id: string;
    correct?: boolean | null;
    score?: number | null;
  };
  correct?: boolean | null;
  score?: number | null;
  reveal?: string | null;
  next_due_at?: string | null;
  error?: string;
};

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
