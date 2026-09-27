// Pure SM-2 scheduling math, shared by the attempts endpoint and unit tests.
// `state` is the previous learner_item_state row (or undefined for new items).
export function sm2Update(state, correct) {
  const intervalDays = state?.interval_days || 0;
  const ease = state?.ease || 2.5;
  const nextInterval = correct ? Math.max(1, intervalDays * ease || 1) : 0;
  const nextEase = Math.max(1.3, ease + (correct ? 0.05 : -0.2));
  return { interval_days: nextInterval, ease: nextEase };
}

// Mastery nudge applied per concept linked to an attempted item.
export function masteryDelta(correct) {
  return correct ? 0.08 : -0.06;
}
