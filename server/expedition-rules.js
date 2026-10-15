export const EXPEDITION_LENGTH = 10;
export const EXPEDITION_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function expeditionTarget(step, route) {
  const base = Math.min(5, Math.floor(step / 2));
  return Math.max(0, Math.min(5, base + (route === 'hard' ? 1 : route === 'easy' ? -1 : 0)));
}

export function expeditionLevelOrder(step, route) {
  const target = expeditionTarget(step, route);
  return EXPEDITION_LEVELS.map((level, index) => ({ level, index }))
    .sort((a, b) => Math.abs(a.index - target) - Math.abs(b.index - target) || a.index - b.index)
    .map(({ level }) => level);
}

export function expeditionChoice(state, route, livesLeft, livesTotal) {
  if (state.phase !== 'fork' || !['easy', 'hard', 'camp'].includes(route)) return null;
  const healed = route === 'camp' ? Math.min(livesTotal, livesLeft + 1) : livesLeft;
  return { ...state, phase: 'question', route, reward: route === 'hard' ? 3 : 1,
    trail: [...state.trail, { kind: route, step: state.step + 1 }], livesLeft: healed };
}

export function expeditionAnswer(state, correct, level, livesLeft) {
  const step = state.step + 1;
  const trail = [...state.trail, { kind: correct ? 'success' : 'miss', step, level, points: correct ? state.reward : 0 }];
  const nextLives = livesLeft - Number(!correct);
  const done = nextLives === 0 ? 'lives' : step >= EXPEDITION_LENGTH ? 'summit' : null;
  return { state: { ...state, step, trail, phase: correct && !done ? 'fork' : 'question',
    route: correct ? state.route : 'easy', reward: correct ? state.reward : 1 },
    livesLeft: nextLives, points: correct ? state.reward : 0, done };
}
