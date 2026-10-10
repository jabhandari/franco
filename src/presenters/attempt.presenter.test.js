// Unit checks for the attempt presenter: pure render helpers extracted from
// the exercise components and views.
import {
  answeredState,
  hasResult,
  feedbackTone,
  feedbackTitle,
  elapsedMs,
} from './attempt.presenter.js';

function assert(cond, message) {
  if (!cond) throw new Error(`FAIL: ${message}`);
  console.log(`ok - ${message}`);
}

assert(answeredState({ correct: true }) === 'correct', 'answeredState: correct result -> "correct"');
assert(answeredState({ correct: false }) === 'wrong', 'answeredState: wrong result -> "wrong"');
assert(answeredState(null) === null, 'answeredState: null -> null');
assert(answeredState(undefined) === null, 'answeredState: undefined -> null');
assert(answeredState({ error: 'boom' }) === null, 'answeredState: error result -> null');
assert(answeredState({}) === 'wrong', 'answeredState: result without correct flag -> "wrong"');
assert(answeredState({ correct: true, error: 'late' }) === null, 'answeredState: error wins over correct');

assert(hasResult({ correct: true }) === true, 'hasResult: real result -> true');
assert(hasResult({ correct: false }) === true, 'hasResult: wrong result still counts -> true');
assert(hasResult({ error: 'boom' }) === false, 'hasResult: error -> false');
assert(hasResult(null) === false, 'hasResult: null -> false');
assert(hasResult(undefined) === false, 'hasResult: undefined -> false');

assert(feedbackTone({ correct: true }) === 'correct', 'feedbackTone: correct -> "correct"');
assert(feedbackTone({ correct: false }) === 'incorrect', 'feedbackTone: wrong -> "incorrect"');
assert(feedbackTone(null) === 'incorrect', 'feedbackTone: null -> "incorrect"');
assert(feedbackTone({ error: 'x' }) === 'incorrect', 'feedbackTone: error -> "incorrect"');

assert(feedbackTitle({ correct: true }) === 'Correct!', 'feedbackTitle: correct -> "Correct!"');
assert(feedbackTitle({ correct: false }) === 'Not quite.', 'feedbackTitle: wrong -> "Not quite."');
assert(feedbackTitle(null) === 'Not quite.', 'feedbackTitle: null -> "Not quite."');

{
  const started = Date.now();
  const elapsed = elapsedMs(started);
  assert(typeof elapsed === 'number' && elapsed >= 0 && elapsed < 5000, 'elapsedMs: returns ~now minus startedAt');
}

console.log('attempt.presenter checks passed');
