// FRA-21 presenter: pure read-only projections of an attempt result.
// Used by every exercise renderer (MultipleChoice, Spelling, WordOrder,
// PronunciationDrill) so the answered/feedback expressions live in one place.
// No JSX, no hooks, no side effects.

/**
 * Shell answered-state for an attempt result.
 * @param {object|null} result - the attempt result (or { error })
 * @returns {'correct'|'wrong'|null}
 */
export function answeredState(result) {
  if (!result || result.error) return null;
  return result.correct ? 'correct' : 'wrong';
}

/**
 * Whether the result is a real (non-error) answer.
 * @param {object|null} result
 * @returns {boolean}
 */
export function hasResult(result) {
  return Boolean(result && !result.error);
}

/**
 * Feedback tone for a result.
 * @param {object|null} result
 * @returns {'correct'|'incorrect'}
 */
export function feedbackTone(result) {
  return result && result.correct ? 'correct' : 'incorrect';
}

/**
 * Feedback headline for a result.
 * @param {object|null} result
 * @returns {'Correct!'|'Not quite.'}
 */
export function feedbackTitle(result) {
  return result && result.correct ? 'Correct!' : 'Not quite.';
}

/**
 * Milliseconds elapsed since an attempt started.
 * @param {number} startedAt - Date.now() captured when the attempt began
 * @returns {number}
 */
export function elapsedMs(startedAt) {
  return Date.now() - startedAt;
}
